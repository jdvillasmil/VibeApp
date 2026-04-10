import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonInput,
  IonTextarea,
  IonButton,
  IonLabel,
  IonChip,
  IonSpinner,
  IonButtons,
  IonIcon,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { environment } from '../../../environments/environment';

const VIBES = [
  { label: 'Gaming',   emoji: '🎮' },
  { label: 'Music',    emoji: '🎵' },
  { label: 'Studying', emoji: '📚' },
  { label: 'Hang',     emoji: '🤙' },
  { label: 'Chill',    emoji: '😎' },
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonInput,
    IonTextarea,
    IonButton,
    IonLabel,
    IonChip,
    IonSpinner,
    IonButtons,
    IonIcon,
    AvatarComponent,
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  user = signal<any>(null);
  saving = signal(false);
  selectedVibe = signal<string>('');
  vibes = VIBES;

  form = this.fb.group({
    name: [''],
    bio: [''],
    interests: [''],
  });

  constructor() {
    addIcons({ logOutOutline });
  }

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.authService.getProfile();
      this.user.set(res.data);
      this.selectedVibe.set(res.data.vibe ?? '');
      this.form.patchValue({
        name: res.data.name ?? '',
        bio: res.data.bio ?? '',
        interests: (res.data.interests ?? []).join(', '),
      });
    } catch {
      // profile load failed — user will see empty form
    }
  }

  selectVibe(label: string): void {
    this.selectedVibe.set(this.selectedVibe() === label ? '' : label);
  }

  async onSave(): Promise<void> {
    this.saving.set(true);
    const { name, bio, interests } = this.form.value;

    const interestsArr = interests
      ? interests.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    try {
      // Update profile (name, bio, interests)
      const profileRes = await this.authService.updateProfile({
        name: name ?? undefined,
        bio: bio ?? undefined,
        interests: interestsArr.length ? interestsArr : undefined,
      });
      this.user.set(profileRes.data);

      // Update vibe separately if changed
      const vibe = this.selectedVibe();
      if (vibe && vibe !== this.user()?.vibe) {
        await firstValueFrom(
          this.http.patch(`${environment.apiUrl}/users/me/vibe`, { vibe })
        );
        this.user.update((u: any) => ({ ...u, vibe }));
      }

      const toast = await this.toastCtrl.create({
        message: '¡Perfil actualizado!',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo actualizar el perfil.',
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      this.saving.set(false);
    }
  }

  async onAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const formData = new FormData();
    formData.append('avatar', input.files[0]);

    try {
      const res = await firstValueFrom(
        this.http.patch<{ data: { avatar_url: string } }>(
          `${environment.apiUrl}/users/me/avatar`,
          formData
        )
      );
      this.user.update((u: any) => ({ ...u, avatar_url: res.data.avatar_url }));

      const toast = await this.toastCtrl.create({
        message: '¡Foto actualizada!',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo subir la foto.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  async onLogout(): Promise<void> {
    this.socketService.disconnect();
    await this.authService.logout();
    // AuthService.logout() already navigates to /login
  }
}
