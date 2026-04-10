import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
  IonAvatar, IonLabel, IonSpinner, IonRefresher, IonRefresherContent, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubbleOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> { data: T; error: string | null; message: string; }

interface Friend {
  id: number;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  vibe: string | null;
  chat_id: number | null;
}

const VIBE_CONFIG: Record<string, { emoji: string }> = {
  Gaming: { emoji: '🎮' }, Music: { emoji: '🎵' }, Studying: { emoji: '📚' },
  Hang: { emoji: '🤙' }, Chill: { emoji: '😎' },
};

@Component({
  selector: 'app-friends-list',
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
    IonAvatar, IonLabel, IonSpinner, IonRefresher, IonRefresherContent, IonIcon,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Amigos ({{ friends().length }})</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="load($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (friends().length === 0) {
        <div class="empty-state">
          <p class="emoji">🤝</p>
          <h3>Sin amigos todavía</h3>
          <p>Desliza a la derecha en Descubrir para hacer match</p>
        </div>
      } @else {
        <ion-list lines="full">
          @for (f of friends(); track f.id) {
            <ion-item button detail (click)="openChat(f)">
              <ion-avatar slot="start">
                @if (f.avatar_url) {
                  <img [src]="f.avatar_url" alt="avatar"/>
                } @else {
                  <div class="initials-av">{{ initials(f.name) }}</div>
                }
              </ion-avatar>
              <ion-label>
                <h2>{{ f.name }}</h2>
                <p>
                  @if (f.vibe) { <span>{{ vibeEmoji(f.vibe) }} {{ f.vibe }}</span> }
                </p>
                @if (f.bio) { <p class="bio">{{ f.bio }}</p> }
              </ion-label>
              <ion-icon name="chatbubble-outline" slot="end" color="primary"></ion-icon>
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
    .initials-av { width: 100%; height: 100%; border-radius: 50%; background: var(--ion-color-primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.1rem; }
    .bio { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ion-color-medium) !important; }
  `],
})
export class FriendsListPage implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = environment.apiUrl;

  friends = signal<Friend[]>([]);
  loading = signal(true);

  constructor() { addIcons({ chatbubbleOutline }); }

  initials(name: string): string {
    return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }
  vibeEmoji(v: string): string { return VIBE_CONFIG[v]?.emoji ?? ''; }

  async ngOnInit(): Promise<void> { await this.load(); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async load(event?: any): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<Friend[]>>(`${this.api}/friendships`)
      );
      this.friends.set(res.data ?? []);
    } catch { /* ignore */ }
    finally { this.loading.set(false); event?.target?.complete(); }
  }

  openChat(f: Friend): void {
    if (f.chat_id) this.router.navigate(['/tabs/chat', f.chat_id]);
  }
}
