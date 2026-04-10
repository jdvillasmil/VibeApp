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
  AlertController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { environment } from '../../../environments/environment';

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
    AvatarComponent,
  ],
  templateUrl: './profile.page.html',
})
export class ProfilePage implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private alertCtrl = inject(AlertController);

  user = signal<any>(null);

  form = this.fb.group({
    name: [''],
    bio: [''],
  });

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.authService.getProfile();
      this.user.set(res.data);
      this.form.patchValue({
        name: res.data.name ?? '',
        bio: res.data.bio ?? '',
      });
    } catch {
      // If profile load fails, user may need to re-authenticate
    }
  }

  async onSave(): Promise<void> {
    const { name, bio } = this.form.value;
    try {
      const res = await this.authService.updateProfile({
        name: name ?? undefined,
        bio: bio ?? undefined,
      });
      this.user.set(res.data);
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Save Failed',
        message: 'Could not update profile. Please try again.',
        buttons: ['OK'],
      });
      await alert.present();
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
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Upload Failed',
        message: 'Could not upload avatar. Please try again.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}
