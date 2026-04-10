import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonInput,
  IonButton,
  IonLabel,
  IonNote,
  AlertController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonInput,
    IonButton,
    IonLabel,
    IonNote,
  ],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
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
      this.router.navigate(['/profile']);
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Login Failed',
        message: 'Invalid email or password.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }
}
