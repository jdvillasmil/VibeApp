import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonLabel, IonNote, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, people, chatbubbles, notifications } from 'ionicons/icons';
import { environment } from '../../../environments/environment';

interface Notification {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonNote, IonIcon],
  templateUrl: './notifications.page.html',
})
export class NotificationsPage implements OnInit {
  private http = inject(HttpClient);
  notificationList = signal<Notification[]>([]);

  constructor() { addIcons({ heart, people, chatbubbles, notifications }); }

  async ngOnInit(): Promise<void> {
    await this.loadAndMarkRead();
  }

  private async loadAndMarkRead(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Notification[] }>(`${environment.apiUrl}/notifications`)
      );
      this.notificationList.set(res.data ?? []);
      // Mark all as read immediately after loading
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/notifications/read`, {})
      );
    } catch {
      console.warn('[notifications] failed to load');
    }
  }

  iconForType(type: string): string {
    if (type === 'new_match') return 'heart';
    if (type === 'friend_request') return 'people';
    if (type === 'new_message') return 'chatbubbles';
    return 'notifications';
  }

  labelForType(type: string, payload: Record<string, unknown>): string {
    const name = String(payload['fromUserName'] ?? payload['withUserName'] ?? payload['senderName'] ?? '');
    if (type === 'friend_request') return `${name} quiere ser tu amigo`;
    if (type === 'new_match') return `Match con ${name}!`;
    if (type === 'new_message') return `Mensaje de ${name}`;
    return 'Notificación';
  }
}
