import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

const AUTH_RETRY_HEADER = 'X-Auth-Retry';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();
  const url = req.url;
  const skipBearer =
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh');

  const authReq =
    token && !skipBearer
      ? req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        })
      : req;

  return next(authReq).pipe(
    catchError(error => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      if (req.url.includes('/api/auth/')) {
        return throwError(() => error);
      }
      const canRetryAuth =
        (error.status === 401 || error.status === 403) &&
        !req.headers.has(AUTH_RETRY_HEADER) &&
        typeof localStorage !== 'undefined' &&
        !!localStorage.getItem('refreshToken');
      if (!canRetryAuth) {
        return throwError(() => error);
      }
      return authService.refreshToken().pipe(
        switchMap(() => {
          const newToken = authService.getAccessToken();
          if (!newToken) {
            return throwError(() => error);
          }
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
              [AUTH_RETRY_HEADER]: '1'
            }
          });
          return next(retryReq);
        }),
        catchError(refreshError => {
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
