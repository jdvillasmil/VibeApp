import { Component, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonText,
} from '@ionic/angular/standalone';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonText],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  private http = inject(HttpClient);
  status = signal<string>('not checked');

  checkHealth(): void {
    this.http.get<{ data: { status: string } }>(`${environment.apiUrl}/health`).subscribe({
      next: (res) => this.status.set(res.data.status),
      error: () => this.status.set('ERROR — check CORS or backend'),
    });
  }
}
