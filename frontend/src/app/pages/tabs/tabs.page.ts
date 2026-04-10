import { Component, OnInit, inject } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { flame, people, chatbubbles, person } from 'ionicons/icons';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
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
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage implements OnInit {
  private socket = inject(SocketService);

  constructor() { addIcons({ flame, people, chatbubbles, person }); }

  async ngOnInit(): Promise<void> {
    // Connect socket when tabs load (user is authenticated)
    await this.socket.connect();
  }
}
