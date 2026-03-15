import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WebSocketService, MessageReceivedEvent } from './websocket.service';
import { AuthService } from './auth.service';

class MockWebSocket {
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
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WebSocketService);
    authService = TestBed.inject(AuthService);
    authService.saveCredentials('alice', 'pass123');
  });

  afterEach(() => {
    service.disconnect();
    sessionStorage.clear();
    globalThis.WebSocket = originalWebSocket;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should connect with correct URL', () => {
    service.connect();
    expect(mockSocket).toBeTruthy();
    expect(mockSocket.url).toBe('ws://localhost:8080/api/connect?username=alice&password=pass123');
  });

  it('should emit MessageReceived events', () => {
    const received: MessageReceivedEvent[] = [];
    service.messages$.subscribe(msg => received.push(msg));

    service.connect();
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

    service.connect();
    mockSocket.simulateMessage(JSON.stringify({
      event_type: 'SomeOtherEvent',
      event_body: { data: 'test' },
    }));

    expect(received.length).toBe(0);
  });

  it('should ignore malformed messages', () => {
    const received: MessageReceivedEvent[] = [];
    service.messages$.subscribe(msg => received.push(msg));

    service.connect();
    mockSocket.simulateMessage('not-valid-json');

    expect(received.length).toBe(0);
  });

  it('should emit connection errors', () => {
    const errors: Event[] = [];
    service.connectionError$.subscribe(err => errors.push(err));

    service.connect();
    mockSocket.simulateError();

    expect(errors.length).toBe(1);
  });

  it('should disconnect and close socket', () => {
    service.connect();
    expect(mockSocket.closed).toBe(false);

    service.disconnect();
    expect(mockSocket.closed).toBe(true);
  });

  it('should close previous connection on reconnect', () => {
    service.connect();
    const firstSocket = mockSocket;

    service.connect();
    expect(firstSocket.closed).toBe(true);
    expect(mockSocket).not.toBe(firstSocket);
  });

  it('should report connection status', () => {
    expect(service.isConnected()).toBe(false);

    service.connect();
    mockSocket.readyState = WebSocket.OPEN;
    expect(service.isConnected()).toBe(true);

    service.disconnect();
    expect(service.isConnected()).toBe(false);
  });

  it('should set socket to null on close event', () => {
    service.connect();
    mockSocket.simulateClose();
    expect(service.isConnected()).toBe(false);
  });
});
