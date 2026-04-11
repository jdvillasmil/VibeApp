import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
  IonAvatar, IonLabel, IonBadge, IonSpinner, IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { SocketService } from '../../core/services/socket.service';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> { data: T; error: string | null; message: string; }

interface ChatSummary {
  chat_id: number;
  id: number;
  name: string;
  avatar_url: string | null;
  vibe: string | null;
  last_message_body: string | null;
  last_message_image: string | null;
  last_message_at: string | null;
  unread_count: number;
}

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
    IonAvatar, IonLabel, IonBadge, IonSpinner, IonRefresher, IonRefresherContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Chats</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="load($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (chats().length === 0) {
        <div class="empty-state">
          <p class="emoji">💬</p>
          <h3>Sin conversaciones</h3>
          <p>Haz match con alguien para chatear</p>
        </div>
      } @else {
        <ion-list lines="full">
          @for (chat of chats(); track chat.chat_id) {
            <ion-item button detail (click)="open(chat)">
              <ion-avatar slot="start">
                @if (chat.avatar_url) {
                  <img [src]="chat.avatar_url" alt="avatar"/>
                } @else {
                  <div class="initials-av">{{ initials(chat.name) }}</div>
                }
              </ion-avatar>
              <ion-label>
                <h2>{{ chat.name }}</h2>
                <p>{{ preview(chat) }}</p>
              </ion-label>
              @if (chat.unread_count > 0) {
                <ion-badge slot="end" color="danger">{{ chat.unread_count }}</ion-badge>
              }
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    .center { display: flex; justify-content: center; align-items: center; height: 70vh; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 75vh; text-align: center; padding: 24px; gap: 8px; }
    .emoji { font-size: 5rem; margin: 0; }
    h3 { font-size: 1.3rem; font-weight: 700; margin: 0; }
    .empty-state p { color: var(--ion-color-medium); margin: 0; }
    .initials-av { width: 100%; height: 100%; border-radius: 50%; background: var(--ion-color-secondary); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.1rem; }
  `],
})
export class ChatListPage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private socket = inject(SocketService);
  private router = inject(Router);
  private api = environment.apiUrl;

  chats = signal<ChatSummary[]>([]);
  loading = signal(true);
  private msgSub?: Subscription;

  initials(name: string): string {
    return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }

  preview(chat: ChatSummary): string {
    if (chat.last_message_image && !chat.last_message_body) return '📷 Imagen';
    return chat.last_message_body ?? 'Inicia la conversación...';
  }

  async ngOnInit(): Promise<void> {
    await this.load();
    // Refresh list header on any new message
    this.msgSub = this.socket.newMessage$.subscribe(() => this.load());
  }

  ngOnDestroy(): void { this.msgSub?.unsubscribe(); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async load(event?: any): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<ChatSummary[]>>(`${this.api}/chats`)
      );
      this.chats.set(res.data ?? []);
    } catch { /* ignore */ }
    finally { this.loading.set(false); event?.target?.complete(); }
  }

  open(chat: ChatSummary): void {
    this.router.navigate(['/tabs/chat', chat.chat_id], { state: { partnerName: chat.name } });
  }
}
