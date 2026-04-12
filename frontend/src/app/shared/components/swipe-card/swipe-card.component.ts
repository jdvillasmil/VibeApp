import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { IonChip, IonIcon, IonButton, GestureController, Gesture } from '@ionic/angular/standalone';

export interface SwipeUser {
  id: number;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[] | null;
  vibe: string | null;
}

const VIBE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  Gaming:   { emoji: '🎮', color: '#7c3aed', bg: 'linear-gradient(135deg,#7c3aed,#a855f7)' },
  Music:    { emoji: '🎵', color: '#db2777', bg: 'linear-gradient(135deg,#db2777,#f472b6)' },
  Studying: { emoji: '📚', color: '#0891b2', bg: 'linear-gradient(135deg,#0891b2,#38bdf8)' },
  Hang:     { emoji: '🤙', color: '#059669', bg: 'linear-gradient(135deg,#059669,#34d399)' },
  Chill:    { emoji: '😎', color: '#d97706', bg: 'linear-gradient(135deg,#d97706,#fbbf24)' },
};

function calcMatchScore(myInterests: string[], theirInterests: string[]): number {
  if (!myInterests?.length || !theirInterests?.length) return 0;
  const mine = new Set(myInterests.map((i) => i.toLowerCase()));
  const shared = theirInterests.filter((i) => mine.has(i.toLowerCase())).length;
  const total = new Set([...myInterests, ...theirInterests].map((i) => i.toLowerCase())).size;
  return Math.round((shared / total) * 100);
}

@Component({
  selector: 'app-swipe-card',
  standalone: true,
  imports: [IonChip],
  template: `
    <div class="card" id="swipe-card-{{ user.id }}">
      <!-- VIBE HERO — biggest element -->
      @if (user.vibe) {
        <div class="vibe-hero" [style.background]="vibeBg()">
          <span class="vibe-emoji">{{ vibeEmoji() }}</span>
          <span class="vibe-label">{{ user.vibe }}</span>
        </div>
      } @else {
        <div class="vibe-hero vibe-none">
          <span class="vibe-emoji">✨</span>
          <span class="vibe-label">Free spirit</span>
        </div>
      }

      <!-- Avatar + Name overlay -->
      <div class="avatar-row">
        @if (user.avatar_url) {
          <img [src]="user.avatar_url" class="avatar" alt="avatar"/>
        } @else {
          <div class="avatar initials-avatar">{{ initials() }}</div>
        }
        <div class="name-block">
          <h2 class="name">{{ user.name }}</h2>
          @if (matchScore() > 0) {
            <span class="match-pill">{{ matchScore() }}% compatible</span>
          }
        </div>
      </div>

      <!-- Bio -->
      @if (user.bio) {
        <p class="bio">{{ user.bio }}</p>
      }

      <!-- Interests -->
      @if (user.interests?.length) {
        <div class="interests">
          @for (interest of user.interests!.slice(0, 5); track interest) {
            <ion-chip class="chip">{{ interest }}</ion-chip>
          }
        </div>
      }

      <!-- Swipe overlays -->
      <div class="overlay like-overlay" [style.opacity]="likeOpacity()">
        <span class="overlay-text">✓ LIKE</span>
      </div>
      <div class="overlay nope-overlay" [style.opacity]="nopeOpacity()">
        <span class="overlay-text">✗ NOPE</span>
      </div>
    </div>
  `,
  styles: [`
    .card { position: relative; width: 100%; border-radius: 20px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 40px rgba(0,0,0,0.15); user-select: none; cursor: grab; }
    .vibe-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px 24px; }
    .vibe-none { background: linear-gradient(135deg,#6b7280,#9ca3af); }
    .vibe-emoji { font-size: 4.5rem; line-height: 1; }
    .vibe-label { font-size: 1.6rem; font-weight: 800; color: white; letter-spacing: 1px; margin-top: 8px; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .avatar-row { display: flex; align-items: center; gap: 12px; padding: 16px 16px 0; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); flex-shrink: 0; }
    .initials-avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--ion-color-primary); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.4rem; font-weight: bold; flex-shrink: 0; }
    .name-block { flex: 1; }
    .name { margin: 0; font-size: 1.4rem; font-weight: 700; color: #1e293b; }
    .match-pill { display: inline-block; background: #dcfce7; color: #15803d; font-size: 0.75rem; font-weight: 600; padding: 2px 10px; border-radius: 20px; margin-top: 4px; }
    .bio { margin: 12px 16px 0; font-size: 0.9rem; color: #64748b; line-height: 1.4; }
    .interests { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px 12px 16px; }
    .chip { --background: #f1f5f9; --color: #475569; font-size: 0.75rem; height: 26px; }
    .overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; transition: opacity 0.1s; }
    .like-overlay { background: rgba(34,197,94,0.35); }
    .nope-overlay { background: rgba(239,68,68,0.35); }
    .overlay-text { font-size: 3rem; font-weight: 900; color: white; text-shadow: 0 2px 8px rgba(0,0,0,0.4); letter-spacing: 4px; }
  `],
})
export class SwipeCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) user!: SwipeUser;
  @Input() myInterests: string[] = [];
  @Output() liked = new EventEmitter<SwipeUser>();
  @Output() rejected = new EventEmitter<SwipeUser>();

  private gestureCtrl = inject(GestureController);
  private gesture?: Gesture;
  private offsetX = 0;
  private likeOpacityVal = 0;
  private nopeOpacityVal = 0;

  likeOpacity = () => this.likeOpacityVal;
  nopeOpacity = () => this.nopeOpacityVal;

  vibeBg(): string {
    return VIBE_CONFIG[this.user.vibe ?? '']?.bg ?? 'linear-gradient(135deg,#6b7280,#9ca3af)';
  }

  vibeEmoji(): string {
    return VIBE_CONFIG[this.user.vibe ?? '']?.emoji ?? '✨';
  }

  initials(): string {
    return this.user.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }

  matchScore(): number {
    return calcMatchScore(this.myInterests, this.user.interests ?? []);
  }

  ngOnInit(): void {
    setTimeout(() => this.setupGesture(), 200);
  }

  ngOnDestroy(): void {
    this.gesture?.destroy();
  }

  private setupGesture(): void {
    const el = document.getElementById(`swipe-card-${this.user.id}`);
    if (!el) return;

    let startX = 0;
    this.gesture = this.gestureCtrl.create({
      el,
      gestureName: 'card-swipe',
      threshold: 0,
      onStart: (d) => { startX = d.startX; },
      onMove: (d) => {
        this.offsetX = d.currentX - startX;
        const rotate = this.offsetX * 0.06;
        el.style.transition = 'none';
        el.style.transform = `translateX(${this.offsetX}px) rotate(${rotate}deg)`;
        this.likeOpacityVal = this.offsetX > 0 ? Math.min(this.offsetX / 80, 1) : 0;
        this.nopeOpacityVal = this.offsetX < 0 ? Math.min(-this.offsetX / 80, 1) : 0;
      },
      onEnd: () => {
        el.style.transition = 'transform 0.35s cubic-bezier(.17,.67,.35,1)';
        if (this.offsetX > 90) {
          el.style.transform = 'translateX(120vw) rotate(30deg)';
          setTimeout(() => this.liked.emit(this.user), 350);
        } else if (this.offsetX < -90) {
          el.style.transform = 'translateX(-120vw) rotate(-30deg)';
          setTimeout(() => this.rejected.emit(this.user), 350);
        } else {
          el.style.transform = '';
          this.likeOpacityVal = 0;
          this.nopeOpacityVal = 0;
        }
        this.offsetX = 0;
      },
    });
    this.gesture.enable();
  }
}
