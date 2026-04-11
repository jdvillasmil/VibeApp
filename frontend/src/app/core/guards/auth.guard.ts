import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/** Blocks unauthenticated users — redirects to /login */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return from(authService.getToken()).pipe(
    map((token) => (token ? true : router.createUrlTree(['/login'])))
  );
};

/** Blocks already-authenticated users — redirects to /tabs/discover */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return from(authService.getToken()).pipe(
    map((token) => (!token ? true : router.createUrlTree(['/tabs/discover'])))
  );
};
