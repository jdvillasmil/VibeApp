import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

const COLORS = [
  '#E57373',
  '#81C784',
  '#64B5F6',
  '#FFD54F',
  '#BA68C8',
  '#4DB6AC',
  '#FF8A65',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % COLORS.length;
  }
  return hash;
}

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar-container">
      <ng-container *ngIf="!avatarUrl; else imgTpl">
        <div
          class="avatar-initials"
          [style.background]="bgColor()"
        >
          {{ initials() }}
        </div>
      </ng-container>
      <ng-template #imgTpl>
        <img
          class="avatar-img"
          [src]="avatarUrl"
          [alt]="name"
          (error)="onError()"
        />
      </ng-template>
    </div>
  `,
  styles: [`
    .avatar-container {
      display: inline-block;
    }
    .avatar-initials {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 600;
      color: #fff;
    }
    .avatar-img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
    }
  `],
})
export class AvatarComponent {
  @Input() avatarUrl: string | null = null;
  @Input() name: string = '';

  initials = computed(() =>
    this.name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  );

  bgColor = computed(() => COLORS[hashName(this.name)]);

  onError(): void {
    this.avatarUrl = null;
  }
}
