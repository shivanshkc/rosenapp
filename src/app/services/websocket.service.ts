import { Injectable, inject, OnDestroy } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private api = inject(ApiService);
  private socket: WebSocket | null = null;
  private messagesSubject = new Subject<MessageReceivedEvent>();
  private connectionErrorSubject = new Subject<Event>();

  readonly messages$: Observable<MessageReceivedEvent> = this.messagesSubject.asObservable();
  readonly connectionError$: Observable<Event> = this.connectionErrorSubject.asObservable();

  connect(): Observable<void> {
    this.disconnect();

    return new Observable<void>(subscriber => {
      const url = this.api.getWebSocketUrl();
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
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
      };
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.onopen = null;
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.messagesSubject.complete();
    this.connectionErrorSubject.complete();
  }
}
