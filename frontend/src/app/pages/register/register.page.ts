import { Component, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonInput, IonButton, AlertController } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { PushNotificationsService } from '../../core/services/push-notifications.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonButton,
  ],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private pushNotifications = inject(PushNotificationsService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  selectedFile = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const { name, email, password } = this.form.value;
    const formData = new FormData();
    formData.append('name', name!);
    formData.append('email', email!);
    formData.append('password', password!);

    const file = this.selectedFile();
    if (file) {
      formData.append('avatar', file);
    }

    try {
      const res = await this.authService.register(formData);
      await this.authService.setToken(res.data.token);
      try { await this.pushNotifications.initialize(); } catch { /* FCM optional */ }
      try { await this.socketService.connect(res.data.token); } catch { /* socket optional */ }
      this.router.navigate(['/tabs/discover'], { replaceUrl: true });
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Error al registrarse',
        message: 'No se pudo crear la cuenta. Intenta con otro email.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }
}
