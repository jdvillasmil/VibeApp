import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: number;
  chat_id: number;
  sender_id: number;
  body: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private auth = inject(AuthService);
  private socket: Socket | null = null;

  newMessage$ = new Subject<ChatMessage>();
  typingEvent$ = new Subject<{ userId: number; chatId: number }>();
  stopTypingEvent$ = new Subject<{ userId: number; chatId: number }>();
  messagesRead$ = new Subject<{ chatId: number; userId: number }>();
  newMatch$ = new Subject<{ chatId: number; userId: number }>();

  async connect(): Promise<void> {
    if (this.socket?.connected) return;
    const token = await this.auth.getToken();
    if (!token) return;

    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('new_message', (msg: ChatMessage) => this.newMessage$.next(msg));
    this.socket.on('typing', (d: { userId: number; chatId: number }) => this.typingEvent$.next(d));
    this.socket.on('stop_typing', (d: { userId: number; chatId: number }) => this.stopTypingEvent$.next(d));
    this.socket.on('messages_read', (d: { chatId: number; userId: number }) => this.messagesRead$.next(d));
    this.socket.on('new_match', (d: { chatId: number; userId: number }) => this.newMatch$.next(d));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinChat(chatId: number): void { this.socket?.emit('join_chat', chatId); }
  leaveChat(chatId: number): void { this.socket?.emit('leave_chat', chatId); }
  sendMessage(chatId: number, body: string): void { this.socket?.emit('send_message', { chatId, body }); }
  sendImage(chatId: number, imageUrl: string): void { this.socket?.emit('send_image', { chatId, imageUrl }); }
  startTyping(chatId: number): void { this.socket?.emit('typing', { chatId }); }
  stopTyping(chatId: number): void { this.socket?.emit('stop_typing', { chatId }); }
  markRead(chatId: number): void { this.socket?.emit('read_messages', { chatId }); }
}
