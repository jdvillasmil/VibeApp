import { Component, signal, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
  IonFooter, IonInput, IonIcon, IonSpinner, IonButtons, IonBackButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, imageOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { SocketService, ChatMessage } from '../../core/services/socket.service';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> { data: T; error: string | null; message: string; }

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
    IonFooter, IonInput, IonIcon, IonSpinner, IonButtons, IonBackButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/chats"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ partnerName() }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content #content>
      @if (loading()) {
        <div class="center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <div class="msgs">
          @for (msg of messages(); track msg.id) {
            <div class="msg-wrap" [class.mine]="isMine(msg)">
              <div class="bubble" [class.mine]="isMine(msg)">
                @if (msg.image_url) {
                  <img [src]="msg.image_url" class="msg-img" (click)="openImg(msg.image_url!)" alt="img"/>
                }
                @if (msg.body) { <p>{{ msg.body }}</p> }
                <div class="meta">
                  <span class="ts">{{ fmtTime(msg.created_at) }}</span>
                  @if (isMine(msg)) {
                    <span class="tick" [class.read]="!!msg.read_at">✓✓</span>
                  }
                </div>
              </div>
            </div>
          }
          @if (partnerTyping()) {
            <div class="msg-wrap">
              <div class="bubble typing">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            </div>
          }
          <div #bottom></div>
        </div>
      }
    </ion-content>

    <ion-footer>
      <div class="toolbar">
        <ion-button fill="clear" (click)="pickImg()">
          <ion-icon name="image-outline" slot="icon-only"></ion-icon>
        </ion-button>
        <input type="file" accept="image/*" id="chat-img-input" style="display:none"
               (change)="onImgSelected($event)"/>
        <ion-input
          [(ngModel)]="text"
          placeholder="Mensaje..."
          (ionInput)="onTyping()"
          (keyup.enter)="send()"
          class="flex-input"
        ></ion-input>
        <ion-button fill="clear" [disabled]="!text.trim()" (click)="send()">
          <ion-icon name="send" slot="icon-only" color="primary"></ion-icon>
        </ion-button>
      </div>
    </ion-footer>
  `,
  styles: [`
    .center { display: flex; justify-content: center; align-items: center; height: 70vh; }
    .msgs { display: flex; flex-direction: column; padding: 12px; gap: 6px; min-height: 100%; }
    .msg-wrap { display: flex; }
    .msg-wrap.mine { justify-content: flex-end; }
    .bubble { max-width: 78%; background: #f1f5f9; border-radius: 18px 18px 18px 4px; padding: 8px 12px; }
    .bubble.mine { background: var(--ion-color-primary); color: white; border-radius: 18px 18px 4px 18px; }
    .bubble p { margin: 0; word-break: break-word; line-height: 1.4; }
    .msg-img { max-width: 220px; max-height: 220px; border-radius: 10px; display: block; cursor: pointer; object-fit: cover; }
    .meta { display: flex; align-items: center; gap: 4px; margin-top: 3px; justify-content: flex-end; }
    .ts { font-size: 0.65rem; opacity: 0.6; }
    .tick { font-size: 0.7rem; opacity: 0.6; }
    .tick.read { color: #60a5fa; opacity: 1; }
    .bubble.mine .tick.read { color: #bfdbfe; }
    /* Typing */
    .typing { display: flex; gap: 5px; align-items: center; padding: 12px 16px; border-radius: 18px 18px 18px 4px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ion-color-medium); animation: bounce 1s infinite; }
    .dot:nth-child(2) { animation-delay: .2s; }
    .dot:nth-child(3) { animation-delay: .4s; }
    @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
    /* Footer */
    .toolbar { display: flex; align-items: center; padding: 4px 4px; border-top: 1px solid #e2e8f0; background: var(--ion-background-color, white); }
    .flex-input { flex: 1; --padding-start: 12px; }
  `],
})
export class ChatRoomPage implements OnInit, OnDestroy {
  @ViewChild('content') ionContent?: IonContent;

  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private api = environment.apiUrl;

  chatId = 0;
  myId = signal(0);
  partnerName = signal('Chat');
  messages = signal<ChatMessage[]>([]);
  loading = signal(true);
  text = '';
  partnerTyping = signal(false);
  private typingTimer?: ReturnType<typeof setTimeout>;
  private subs: Subscription[] = [];

  constructor() { addIcons({ send, imageOutline }); }

  isMine(msg: ChatMessage): boolean { return msg.sender_id === this.myId(); }
  fmtTime(ts: string): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  openImg(url: string): void { window.open(url, '_blank'); }

  async ngOnInit(): Promise<void> {
    this.chatId = Number(this.route.snapshot.paramMap.get('id'));

    // Get own user id from profile
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<{ id: number; name: string }>>(`${this.api}/users/me`)
      );
      this.myId.set(res.data.id);
    } catch { /* use 0 */ }

    // Load message history
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<ChatMessage[]>>(`${this.api}/chats/${this.chatId}/messages`)
      );
      this.messages.set(res.data ?? []);
      // Derive partner name from first message by other user
      const other = res.data.find((m) => m.sender_id !== this.myId());
      if (other) this.partnerName.set(other.sender_name);
    } catch { /* ignore */ }
    finally { this.loading.set(false); }

    // Join socket room and mark read
    this.socket.joinChat(this.chatId);
    this.socket.markRead(this.chatId);

    // Subscribe to real-time events
    this.subs.push(
      this.socket.newMessage$.subscribe((msg) => {
        if (msg.chat_id !== this.chatId) return;
        this.messages.update((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (!this.partnerName() || this.partnerName() === 'Chat') {
          if (msg.sender_id !== this.myId()) this.partnerName.set(msg.sender_name);
        }
        if (msg.sender_id !== this.myId()) this.socket.markRead(this.chatId);
        this.scrollBottom();
      }),
      this.socket.typingEvent$.subscribe((d) => {
        if (d.chatId === this.chatId && d.userId !== this.myId()) {
          this.partnerTyping.set(true);
        }
      }),
      this.socket.stopTypingEvent$.subscribe((d) => {
        if (d.chatId === this.chatId) this.partnerTyping.set(false);
      }),
      this.socket.messagesRead$.subscribe((d) => {
        if (d.chatId !== this.chatId) return;
        this.messages.update((prev) =>
          prev.map((m) =>
            m.sender_id === this.myId() && !m.read_at
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
      }),
    );

    this.scrollBottom();
  }

  ngOnDestroy(): void {
    this.socket.leaveChat(this.chatId);
    this.subs.forEach((s) => s.unsubscribe());
    clearTimeout(this.typingTimer);
  }

  onTyping(): void {
    this.socket.startTyping(this.chatId);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.socket.stopTyping(this.chatId), 2000);
  }

  send(): void {
    const body = this.text.trim();
    if (!body) return;
    this.socket.sendMessage(this.chatId, body);
    this.text = '';
    this.socket.stopTyping(this.chatId);
    clearTimeout(this.typingTimer);
  }

  pickImg(): void {
    (document.getElementById('chat-img-input') as HTMLInputElement)?.click();
  }

  async onImgSelected(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await firstValueFrom(
        this.http.post<ApiResponse<ChatMessage>>(`${this.api}/chats/${this.chatId}/images`, form)
      );
      // Add locally; socket room will also broadcast
      this.messages.update((prev) => {
        if (prev.find((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      this.scrollBottom();
    } catch { /* ignore */ }
  }

  private scrollBottom(): void {
    setTimeout(() => this.ionContent?.scrollToBottom(200), 80);
  }
}
