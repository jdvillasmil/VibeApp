import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
  IonSpinner, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, close, refreshOutline } from 'ionicons/icons';
import { SwipeCardComponent, SwipeUser } from '../../shared/components/swipe-card/swipe-card.component';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> { data: T; error: string | null; message: string; }

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonSpinner, IonIcon,
    SwipeCardComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Descubrir</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (loading()) {
        <div class="center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (stack().length === 0) {
        <div class="empty-state">
          <p class="emoji">🎉</p>
          <h3>¡Has visto a todos!</h3>
          <p>Vuelve más tarde para conocer nuevas personas</p>
          <ion-button fill="outline" (click)="loadStack()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Actualizar
          </ion-button>
        </div>
      } @else {
        @if (matchToast()) {
          <div class="match-toast">🎉 ¡Es un match! Ya pueden chatear</div>
        }

        <div class="discover-layout">
          <div class="stack-container">
            @if (stack().length > 1) {
              <div class="card-shadow"></div>
            }
            <app-swipe-card
              [user]="stack()[0]"
              [myInterests]="myInterests()"
              (liked)="onLike($event)"
              (rejected)="onReject($event)"
            ></app-swipe-card>
          </div>

          <div class="action-row">
            <ion-button
              class="action-btn nope-btn"
              shape="round"
              fill="outline"
              color="danger"
              (click)="onReject(stack()[0])"
              [disabled]="acting()"
            >
              <ion-icon name="close" slot="icon-only" size="large"></ion-icon>
            </ion-button>
            <ion-button
              class="action-btn like-btn"
              shape="round"
              fill="solid"
              color="success"
              (click)="onLike(stack()[0])"
              [disabled]="acting()"
            >
              <ion-icon name="heart" slot="icon-only" size="large"></ion-icon>
            </ion-button>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .center { display: flex; justify-content: center; align-items: center; height: 70vh; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center; padding: 24px; gap: 8px; }
    .emoji { font-size: 5rem; margin: 0; }
    h3 { font-size: 1.4rem; font-weight: 700; margin: 0; }
    .empty-state p { color: var(--ion-color-medium); margin: 0; }

    .discover-layout { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 56px); padding: 16px; box-sizing: border-box; }
    .stack-container { position: relative; width: 100%; max-width: 400px; }
    .card-shadow { position: absolute; top: 24px; left: 28px; right: 28px; height: 100%; background: #e2e8f0; border-radius: 20px; z-index: 0; }
    app-swipe-card { position: relative; z-index: 1; display: block; }

    .action-row { display: flex; justify-content: center; gap: 48px; padding: 24px 16px 0; width: 100%; max-width: 400px; }
    .action-btn { width: 68px; height: 68px; --border-radius: 50%; }
    .match-toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 9999; background: #16a34a; color: white; padding: 14px 32px; border-radius: 28px; font-weight: 700; font-size: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.2); white-space: nowrap; }
  `],
})
export class DiscoverPage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private socket = inject(SocketService);
  private auth = inject(AuthService);
  private api = environment.apiUrl;

  stack = signal<SwipeUser[]>([]);
  myInterests = signal<string[]>([]);
  loading = signal(true);
  acting = signal(false);
  matchToast = signal(false);
  private matchSub?: Subscription;

  constructor() {
    addIcons({ heart, close, refreshOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.loadStack();
    // Load own interests for match score
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<{ interests: string[] | null }>>(`${this.api}/users/me`)
      );
      this.myInterests.set(res.data.interests ?? []);
    } catch { /* non-critical */ }

    this.matchSub = this.socket.newMatch$.subscribe(() => this.showMatchToast());
  }

  ngOnDestroy(): void {
    this.matchSub?.unsubscribe();
  }

  async loadStack(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<SwipeUser[]>>(`${this.api}/discovery`)
      );
      this.stack.set(res.data ?? []);
    } catch {
      this.stack.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async onLike(user: SwipeUser): Promise<void> {
    if (this.acting()) return;
    this.acting.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<{ matched: boolean; chatId?: number }>>(
          `${this.api}/friendships`,
          { userId: user.id, action: 'like' }
        )
      );
      if (res.data.matched) this.showMatchToast();
    } catch { /* ignore — swipe already animated */ }
    this.advance();
    this.acting.set(false);
  }

  async onReject(user: SwipeUser): Promise<void> {
    if (this.acting()) return;
    this.acting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${this.api}/friendships`, { userId: user.id, action: 'reject' })
      );
    } catch { /* ignore */ }
    this.advance();
    this.acting.set(false);
  }

  private advance(): void {
    this.stack.update((s) => s.slice(1));
  }

  private showMatchToast(): void {
    this.matchToast.set(true);
    setTimeout(() => this.matchToast.set(false), 3500);
  }
}
