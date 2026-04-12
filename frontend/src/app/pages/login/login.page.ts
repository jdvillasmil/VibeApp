import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonInput, IonButton, AlertController } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { PushNotificationsService } from '../../core/services/push-notifications.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonButton,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private pushNotifications = inject(PushNotificationsService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const { email, password } = this.form.value;

    try {
      const res = await this.authService.login(email!, password!);
      await this.authService.setToken(res.data.token);
      try { await this.pushNotifications.initialize(); } catch { /* FCM optional */ }
      try { await this.socketService.connect(res.data.token); } catch { /* socket optional */ }
      this.router.navigate(['/tabs/discover'], { replaceUrl: true });
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Error al iniciar sesión',
        message: 'Email o contraseña incorrectos.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }
}
