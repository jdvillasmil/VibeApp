import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private http = inject(HttpClient);

  async initialize(): Promise<void> {
    // No-op in browser — only runs on native Android/iOS
    if (!Capacitor.isNativePlatform()) return;

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    await PushNotifications.addListener('registration', async (token) => {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/users/me/fcm-token`, {
            token: token.value,
          })
        );
      } catch {
        console.warn('[push] failed to register token');
      }
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // App is in foreground — system does NOT auto-show notification
      // Log only; no banner needed (requirements only specify background delivery)
      console.log('[push] foreground notification:', notification.title);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[push] notification tapped:', action.notification.data);
      // Future: navigate to relevant screen based on action.notification.data.type
    });
  }

  async cleanup(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await PushNotifications.removeAllListeners();
  }
}
