import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WebSocketService, MessageReceivedEvent } from './websocket.service';
import { AuthService } from './auth.service';
import { AppConfigService } from './app-config.service';

class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState: number = WebSocket.OPEN;
  closed = false;

  constructor(public url: string) {}

  close() {
    this.closed = true;
    this.readyState = WebSocket.CLOSED;
  }

  simulateOpen() {
    this.onopen?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }

  simulateClose() {
    this.onclose?.();
  }
}

describe('WebSocketService', () => {
  let service: WebSocketService;
  let authService: AuthService;
  let mockSocket: MockWebSocket;
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    originalWebSocket = globalThis.WebSocket;

    (globalThis as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockSocket = this;
      }
    };
    (globalThis as any).WebSocket.OPEN = 1;
    (globalThis as any).WebSocket.CLOSED = 3;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'http://localhost:8080' } },
      ],
    });
    service = TestBed.inject(WebSocketService);
    authService = TestBed.inject(AuthService);
    authService.saveCredentials('alice', 'dummy-password');
  });

  afterEach(() => {
    service.disconnect();
    sessionStorage.clear();
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start in disconnected state', () => {
    expect(service.state()).toBe('disconnected');
  });

  it('should connect with correct URL and emit on open', () => {
    let connected = false;
    service.connect().subscribe(() => (connected = true));

    expect(mockSocket).toBeTruthy();
    expect(mockSocket.url).toBe('ws://localhost:8080/api/connect?username=alice&password=dummy-password');
    expect(service.state()).toBe('connecting');

    mockSocket.simulateOpen();
    expect(connected).toBe(true);
    expect(service.state()).toBe('connected');
  });

  it('should error observable on connection error', () => {
    let errored = false;
    service.connect().subscribe({ error: () => (errored = true) });

    mockSocket.simulateError();
    expect(errored).toBe(true);
  });

  it('should emit MessageReceived events', () => {
    const received: MessageReceivedEvent[] = [];
    service.messages$.subscribe(msg => received.push(msg));

    service.connect().subscribe();
    mockSocket.simulateOpen();
    mockSocket.simulateMessage(JSON.stringify({
      event_type: 'MessageReceived',
      event_body: { message: 'hello', sender: 'bob' },
    }));

    expect(received.length).toBe(1);
    expect(received[0]).toEqual({ message: 'hello', sender: 'bob' });
  });

  it('should ignore non-MessageReceived events', () => {
    const received: MessageReceivedEvent[] = [];
    service.messages$.subscribe(msg => received.push(msg));

    service.connect().subscribe();
    mockSocket.simulateOpen();
    mockSocket.simulateMessage(JSON.stringify({
      event_type: 'SomeOtherEvent',
      event_body: { data: 'test' },
    }));

    expect(received.length).toBe(0);
  });

  it('should ignore malformed messages', () => {
    const received: MessageReceivedEvent[] = [];
    service.messages$.subscribe(msg => received.push(msg));

    service.connect().subscribe();
    mockSocket.simulateOpen();
    mockSocket.simulateMessage('not-valid-json');

    expect(received.length).toBe(0);
  });

  it('should emit connection errors to connectionError$', () => {
    const errors: Event[] = [];
    service.connectionError$.subscribe(err => errors.push(err));

    service.connect().subscribe({ error: () => {} });
    mockSocket.simulateError();

    expect(errors.length).toBe(1);
  });

  it('should disconnect and close socket', () => {
    service.connect().subscribe();
    mockSocket.simulateOpen();
    expect(mockSocket.closed).toBe(false);

    service.disconnect();
    expect(mockSocket.closed).toBe(true);
    expect(service.state()).toBe('disconnected');
  });

  it('should close previous connection on reconnect', () => {
    service.connect().subscribe();
    const firstSocket = mockSocket;
    firstSocket.simulateOpen();

    service.connect().subscribe();
    expect(firstSocket.closed).toBe(true);
    expect(mockSocket).not.toBe(firstSocket);
  });

  it('should report connection status', () => {
    expect(service.isConnected()).toBe(false);

    service.connect().subscribe();
    mockSocket.readyState = WebSocket.OPEN;
    mockSocket.simulateOpen();
    expect(service.isConnected()).toBe(true);

    service.disconnect();
    expect(service.isConnected()).toBe(false);
  });

  it('should set socket to null on close event', () => {
    service.connect().subscribe();
    mockSocket.simulateOpen();
    mockSocket.simulateClose();
    expect(service.isConnected()).toBe(false);
  });

  describe('auto-reconnect', () => {
    it('should schedule reconnect on unexpected close', () => {
      service.connect().subscribe();
      mockSocket.simulateOpen();

      mockSocket.simulateClose();
      expect(service.state()).toBe('reconnecting');
    });

    it('should attempt reconnect after delay', () => {
      service.connect().subscribe();
      const firstSocket = mockSocket;
      firstSocket.simulateOpen();

      firstSocket.simulateClose();
      expect(service.state()).toBe('reconnecting');

      vi.advanceTimersByTime(1000);
      expect(mockSocket).not.toBe(firstSocket);
    });

    it('should transition to connected on successful reconnect', () => {
      service.connect().subscribe();
      mockSocket.simulateOpen();

      mockSocket.simulateClose();
      vi.advanceTimersByTime(1000);

      mockSocket.simulateOpen();
      expect(service.state()).toBe('connected');
    });

    it('should use exponential backoff', () => {
      service.connect().subscribe();
      mockSocket.simulateOpen();

      // First close: 1s delay
      const socket1 = mockSocket;
      socket1.simulateClose();
      vi.advanceTimersByTime(999);
      expect(mockSocket).toBe(socket1); // not reconnected yet
      vi.advanceTimersByTime(1);
      expect(mockSocket).not.toBe(socket1);

      // Second close: 2s delay
      const socket2 = mockSocket;
      socket2.simulateClose();
      vi.advanceTimersByTime(1999);
      expect(mockSocket).toBe(socket2);
      vi.advanceTimersByTime(1);
      expect(mockSocket).not.toBe(socket2);

      // Third close: 4s delay
      const socket3 = mockSocket;
      socket3.simulateClose();
      vi.advanceTimersByTime(3999);
      expect(mockSocket).toBe(socket3);
      vi.advanceTimersByTime(1);
      expect(mockSocket).not.toBe(socket3);
    });

    it('should reset backoff on successful reconnect', () => {
      service.connect().subscribe();
      mockSocket.simulateOpen();

      // Close and reconnect twice to increase backoff
      mockSocket.simulateClose();
      vi.advanceTimersByTime(1000);
      mockSocket.simulateClose();
      vi.advanceTimersByTime(2000);

      // Successful reconnect resets delay
      mockSocket.simulateOpen();
      mockSocket.simulateClose();

      // Should use initial delay (1s) again
      const socketBeforeRetry = mockSocket;
      vi.advanceTimersByTime(1000);
      expect(mockSocket).not.toBe(socketBeforeRetry);
    });

    it('should not reconnect after intentional disconnect', () => {
      service.connect().subscribe();
      mockSocket.simulateOpen();

      service.disconnect();
      expect(service.state()).toBe('disconnected');

      vi.advanceTimersByTime(60000);
      expect(service.state()).toBe('disconnected');
    });

    it('should stop reconnect attempts when disconnect is called', () => {
      service.connect().subscribe();
      mockSocket.simulateOpen();

      mockSocket.simulateClose();
      expect(service.state()).toBe('reconnecting');

      service.disconnect();
      expect(service.state()).toBe('disconnected');

      vi.advanceTimersByTime(60000);
      expect(service.state()).toBe('disconnected');
    });

    it('should receive messages after reconnect', () => {
      const received: MessageReceivedEvent[] = [];
      service.messages$.subscribe(msg => received.push(msg));

      service.connect().subscribe();
      mockSocket.simulateOpen();

      // Connection drops
      mockSocket.simulateClose();
      vi.advanceTimersByTime(1000);

      // Reconnected
      mockSocket.simulateOpen();
      mockSocket.simulateMessage(JSON.stringify({
        event_type: 'MessageReceived',
        event_body: { message: 'hello after reconnect', sender: 'bob' },
      }));

      expect(received.length).toBe(1);
      expect(received[0].message).toBe('hello after reconnect');
    });
  });
});
