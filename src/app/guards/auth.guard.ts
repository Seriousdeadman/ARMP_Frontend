import {isPlatformBrowser} from '@angular/common';
import {catchError, map, of} from 'rxjs';
import {inject, PLATFORM_ID} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const token = authService.getAccessToken();
  const user = authService.getCurrentUser();

  console.log('Guard check - token:', token);
  console.log('Guard check - user:', user);

  if (token && user) {
    return true;
  }

  if (isPlatformBrowser(platformId)) {
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('Guard check - refreshToken:', refreshToken);
    if (refreshToken) {
      return authService.refreshToken().pipe(
        map(() => true),
        catchError(() => {
          router.navigate(['/login']);
          return of(false);
        })
      );
    }
  }

  router.navigate(['/login']);
  return false;
};
