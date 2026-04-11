import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';
import { SocketService } from './socket.service';

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private socketService = inject(SocketService);

  isAuthenticated = signal<boolean>(false);

  async getToken(): Promise<string | null> {
    const result = await Preferences.get({ key: TOKEN_KEY });
    return result.value;
  }

  async setToken(token: string): Promise<void> {
    await Preferences.set({ key: TOKEN_KEY, value: token });
    this.isAuthenticated.set(true);
  }

  async logout(): Promise<void> {
    await Preferences.remove({ key: TOKEN_KEY });
    this.isAuthenticated.set(false);
    this.socketService.disconnect();
    this.router.navigate(['/login']);
  }

  /**
   * Decode JWT payload without verification (server already verified it).
   * Returns { id, email } from the token claims, or null if no token.
   */
  async getTokenPayload(): Promise<{ id: number; email: string } | null> {
    const token = await this.getToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      // Base64url decode the payload
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { id: payload.id, email: payload.email };
    } catch {
      return null;
    }
  }

  login(email: string, password: string) {
    return firstValueFrom(
      this.http.post<{ data: { user: any; token: string } }>(
        `${environment.apiUrl}/auth/login`,
        { email, password }
      )
    );
  }

  register(payload: FormData) {
    return firstValueFrom(
      this.http.post<{ data: { user: any; token: string } }>(
        `${environment.apiUrl}/auth/register`,
        payload
      )
    );
  }

  getProfile() {
    return firstValueFrom(
      this.http.get<{ data: any }>(`${environment.apiUrl}/users/me`)
    );
  }

  updateProfile(body: { name?: string; bio?: string; interests?: string[] }) {
    return firstValueFrom(
      this.http.patch<{ data: any }>(`${environment.apiUrl}/users/me`, body)
    );
  }
}
