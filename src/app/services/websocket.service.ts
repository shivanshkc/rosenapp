import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface WebSocketEvent {
  event_type: string;
  event_body: Record<string, unknown>;
}

export interface MessageReceivedEvent {
  message: string;
  sender: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private api = inject(ApiService);
  private socket: WebSocket | null = null;
  private messagesSubject = new Subject<MessageReceivedEvent>();
  private connectionErrorSubject = new Subject<Event>();
  private intentionalDisconnect = false;
  private retryDelay = INITIAL_RETRY_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = signal<ConnectionState>('disconnected');
  readonly messages$: Observable<MessageReceivedEvent> = this.messagesSubject.asObservable();
  readonly connectionError$: Observable<Event> = this.connectionErrorSubject.asObservable();

  connect(): Observable<void> {
    this.cancelReconnect();
    this.disconnect();
    this.intentionalDisconnect = false;

    return new Observable<void>(subscriber => {
      this.state.set('connecting');
      const url = this.api.getWebSocketUrl();
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.state.set('connected');
        this.retryDelay = INITIAL_RETRY_DELAY;
        subscriber.next();
        subscriber.complete();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const parsed: WebSocketEvent = JSON.parse(event.data);
          if (parsed.event_type === 'MessageReceived') {
            this.messagesSubject.next(parsed.event_body as unknown as MessageReceivedEvent);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.socket.onerror = (event: Event) => {
        this.connectionErrorSubject.next(event);
        subscriber.error(event);
      };

      this.socket.onclose = () => {
        this.socket = null;
        if (!this.intentionalDisconnect) {
          this.scheduleReconnect();
        } else {
          this.state.set('disconnected');
        }
      };
    });
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.cancelReconnect();
    if (this.socket) {
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.onopen = null;
      this.socket.close();
      this.socket = null;
    }
    this.state.set('disconnected');
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.messagesSubject.complete();
    this.connectionErrorSubject.complete();
  }

  private scheduleReconnect(): void {
    this.state.set('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptReconnect();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY);
  }

  private attemptReconnect(): void {
    try {
      const url = this.api.getWebSocketUrl();
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.state.set('connected');
        this.retryDelay = INITIAL_RETRY_DELAY;
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const parsed: WebSocketEvent = JSON.parse(event.data);
          if (parsed.event_type === 'MessageReceived') {
            this.messagesSubject.next(parsed.event_body as unknown as MessageReceivedEvent);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.socket.onerror = (event: Event) => {
        this.connectionErrorSubject.next(event);
      };

      this.socket.onclose = () => {
        this.socket = null;
        if (!this.intentionalDisconnect) {
          this.scheduleReconnect();
        } else {
          this.state.set('disconnected');
        }
      };
    } catch {
      if (!this.intentionalDisconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
