import { Component, inject, signal } from '@angular/core';
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
  AlertController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
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
  ],
  templateUrl: './register.page.html',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  selectedFile = signal<File | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
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
      this.router.navigate(['/profile']);
    } catch {
      const alert = await this.alertCtrl.create({
        header: 'Registration Failed',
        message: 'Could not create account. Please try again.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }
}
