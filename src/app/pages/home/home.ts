import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NewChatDialog } from './new-chat-dialog';

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
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private dialog = inject(MatDialog);
  private nextId = 4;

  darkTheme = signal(window.matchMedia('(prefers-color-scheme: dark)').matches);
  searchQuery = signal('');
  newMessage = '';

  constructor() {
    document.documentElement.classList.toggle('theme-dark', this.darkTheme());
  }

  chats = signal<Chat[]>([
    {
      id: 1,
      username: 'Alice',
      lastMessage: 'Hey, how are you?',
      messages: [
        { text: 'Hi there!', sent: false, timestamp: '10:30 AM' },
        { text: 'Hey! How are you?', sent: true, timestamp: '10:31 AM' },
        { text: "I'm doing great, thanks!", sent: false, timestamp: '10:32 AM' },
        { text: "That's good to hear!", sent: true, timestamp: '10:33 AM' },
        { text: 'Hey, how are you?', sent: false, timestamp: '10:45 AM' },
      ],
    },
    {
      id: 2,
      username: 'Bob',
      lastMessage: 'See you tomorrow!',
      messages: [
        { text: 'Are we still on for tomorrow?', sent: true, timestamp: '2:00 PM' },
        { text: 'Yes, definitely!', sent: false, timestamp: '2:05 PM' },
        { text: 'See you tomorrow!', sent: false, timestamp: '2:06 PM' },
      ],
    },
    {
      id: 3,
      username: 'Charlie',
      lastMessage: 'Thanks for the help!',
      messages: [
        { text: 'Can you help me with something?', sent: false, timestamp: '9:00 AM' },
        { text: 'Sure, what do you need?', sent: true, timestamp: '9:15 AM' },
        { text: 'Thanks for the help!', sent: false, timestamp: '9:30 AM' },
      ],
    },
  ]);

  selectedChat = signal<Chat | null>(null);

  filteredChats = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.chats();
    return this.chats().filter(c => c.username.toLowerCase().includes(query));
  });

  toggleTheme() {
    this.darkTheme.update(v => !v);
    document.documentElement.classList.toggle('theme-dark', this.darkTheme());
  }

  selectChat(chat: Chat) {
    this.selectedChat.set(chat);
  }

  deselectChat() {
    this.selectedChat.set(null);
  }

  openNewChatDialog() {
    const dialogRef = this.dialog.open(NewChatDialog, { width: '360px' });
    dialogRef.afterClosed().subscribe((username: string) => {
      if (username?.trim()) {
        const newChat: Chat = {
          id: this.nextId++,
          username: username.trim(),
          lastMessage: '',
          messages: [],
        };
        this.chats.update(chats => [...chats, newChat]);
        this.selectedChat.set(newChat);
      }
    });
  }

  sendMessage() {
    const chat = this.selectedChat();
    if (!chat || !this.newMessage.trim()) return;

    const message: Message = {
      text: this.newMessage.trim(),
      sent: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    chat.messages.push(message);
    chat.lastMessage = message.text;
    this.newMessage = '';
  }
}
