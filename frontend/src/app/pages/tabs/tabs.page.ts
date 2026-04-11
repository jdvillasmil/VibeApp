import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { flame, people, chatbubbles, person, notifications } from 'ionicons/icons';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [NgIf, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="discover" href="/tabs/discover">
          <ion-icon name="flame"></ion-icon>
          <ion-label>Descubrir</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="friends" href="/tabs/friends">
          <ion-icon name="people"></ion-icon>
          <ion-label>Amigos</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="chats" href="/tabs/chats">
          <ion-icon name="chatbubbles"></ion-icon>
          <ion-label>Chats</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon name="person"></ion-icon>
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="notifications" href="/tabs/notifications">
          <ion-icon name="notifications"></ion-icon>
          <ion-badge *ngIf="unreadCount() > 0" color="danger">{{ unreadCount() }}</ion-badge>
          <ion-label>Notifs</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage implements OnInit, OnDestroy {
  private socket = inject(SocketService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  unreadCount = signal<number>(0);
  private subs: Subscription[] = [];

  constructor() { addIcons({ flame, people, chatbubbles, person, notifications }); }

  async ngOnInit(): Promise<void> {
    const token = await this.auth.getToken();
    if (token) await this.socket.connect(token);
    await this.refreshUnreadCount();

    // Refresh badge when a new match or message notification arrives
    this.subs.push(
      this.socket.newMatch$.subscribe(() => this.unreadCount.update((n) => n + 1)),
      this.socket.newMessage$.subscribe(() => this.refreshUnreadCount()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Array<{ read_at: string | null }> }>(`${environment.apiUrl}/notifications`)
      );
      this.unreadCount.set((res.data ?? []).filter((n) => !n.read_at).length);
    } catch {
      this.unreadCount.set(0);
    }
  }
}
