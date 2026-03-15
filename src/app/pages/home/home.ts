import { Component, computed, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NewChatDialog } from './new-chat-dialog';
import { LogoutDialog } from './logout-dialog';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { WebSocketService, ConnectionState } from '../../services/websocket.service';

interface Message {
  text: string;
  sent: boolean;
  timestamp: string;
}

interface Chat {
  id: number;
  username: string;
  lastMessage: string;
  messages: Message[];
}

@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy, AfterViewChecked {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private ws = inject(WebSocketService);
  private router = inject(Router);
  private messagesSub: Subscription | null = null;
  private nextId = 1;
  private shouldScrollToBottom = false;

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  darkTheme = signal(document.documentElement.classList.contains('theme-dark'));
  searchQuery = signal('');
  newMessage = '';

  connectionState = computed<ConnectionState>(() => this.ws.state());

  chats = signal<Chat[]>([]);
  selectedChat = signal<Chat | null>(null);

  filteredChats = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.chats();
    return this.chats().filter(c => c.username.toLowerCase().includes(query));
  });

  ngOnInit(): void {
    this.ws.connect().subscribe();

    this.messagesSub = this.ws.messages$.subscribe(event => {
      const currentChats = this.chats();
      let chat = currentChats.find(c => c.username === event.sender);

      const message: Message = {
        text: event.message,
        sent: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (chat) {
        this.chats.update(chats =>
          chats.map(c =>
            c.id === chat!.id
              ? { ...c, messages: [...c.messages, message], lastMessage: event.message }
              : c
          )
        );
        if (this.selectedChat()?.id === chat.id) {
          this.selectedChat.set(this.chats().find(c => c.id === chat!.id) ?? null);
          this.shouldScrollToBottom = true;
        }
      } else {
        const newChat: Chat = {
          id: this.nextId++,
          username: event.sender,
          lastMessage: event.message,
          messages: [message],
        };
        this.chats.update(chats => [...chats, newChat]);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.messagesSub?.unsubscribe();
    this.ws.disconnect();
  }

  toggleTheme() {
    this.darkTheme.update(v => !v);
    document.documentElement.classList.toggle('theme-dark', this.darkTheme());
  }

  selectChat(chat: Chat) {
    this.selectedChat.set(chat);
    this.shouldScrollToBottom = true;
  }

  deselectChat() {
    this.selectedChat.set(null);
  }

  logout() {
    const dialogRef = this.dialog.open(LogoutDialog, { width: '320px' });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.ws.disconnect();
        this.auth.clearCredentials();
        this.router.navigate(['/login']);
      }
    });
  }

  openNewChatDialog() {
    const dialogRef = this.dialog.open(NewChatDialog, { width: '360px' });
    dialogRef.afterClosed().subscribe((username: string) => {
      if (username?.trim()) {
        const trimmed = username.trim();
        const existing = this.chats().find(c => c.username === trimmed);
        if (existing) {
          this.selectedChat.set(existing);
        } else {
          const newChat: Chat = {
            id: this.nextId++,
            username: trimmed,
            lastMessage: '',
            messages: [],
          };
          this.chats.update(chats => [...chats, newChat]);
          this.selectedChat.set(newChat);
        }
      }
    });
  }

  sendMessage() {
    const chat = this.selectedChat();
    if (!chat || !this.newMessage.trim()) return;

    const text = this.newMessage.trim();
    this.newMessage = '';

    const message: Message = {
      text,
      sent: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.chats.update(chats =>
      chats.map(c =>
        c.id === chat.id
          ? { ...c, messages: [...c.messages, message], lastMessage: text }
          : c
      )
    );
    this.selectedChat.set(this.chats().find(c => c.id === chat.id) ?? null);
    this.shouldScrollToBottom = true;

    this.api.sendMessage({ message: text, receivers: [chat.username] }).subscribe({
      error: () => {
        this.chats.update(chats =>
          chats.map(c =>
            c.id === chat.id
              ? { ...c, messages: c.messages.filter(m => m !== message) }
              : c
          )
        );
        this.selectedChat.set(this.chats().find(c => c.id === chat.id) ?? null);
        this.snackBar.open('Message failed to send', 'Dismiss', { duration: 4000 });
      },
    });
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
