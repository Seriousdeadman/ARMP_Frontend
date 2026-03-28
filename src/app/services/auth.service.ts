import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError, of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthRequest, AuthResponse, RegisterRequest, RefreshTokenRequest } from '../models/auth.models';
import { User } from '../models/user.models';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private static readonly ACCESS_TOKEN_STORAGE_KEY = 'armp_access_token';

  private apiUrl = `${environment.apiUrl}/api/auth`;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private accessTokenSubject = new BehaviorSubject<string | null>(null);

  currentUser$ = this.currentUserSubject.asObservable();
  isLoggedIn$ = this.currentUser$.pipe(
    map(user => user !== null)
  );
  private platformId = inject(PLATFORM_ID);
  constructor(private http: HttpClient, ) {}

  private clearAccessTokenOnly(): void {
    this.accessTokenSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(AuthService.ACCESS_TOKEN_STORAGE_KEY);
    }
  }

  /**
   * Runs before any routed component. If a refresh token exists, always rotate the access JWT —
   * sessionStorage may hold an expired access token; hydrating it skips refresh and causes 403 on /api/**.
   */
  bootstrapSession(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }
    const rt = localStorage.getItem('refreshToken');
    if (rt) {
      return firstValueFrom(
        this.refreshToken().pipe(
          catchError(() => {
            this.clearAccessTokenOnly();
            return of(null);
          })
        )
      ).then(() => undefined);
    }
    const stored = sessionStorage.getItem(AuthService.ACCESS_TOKEN_STORAGE_KEY);
    if (stored) {
      this.accessTokenSubject.next(stored);
      if (!this.getCurrentUser()) {
        return firstValueFrom(
          this.syncCurrentUserFromServer().pipe(
            catchError(() => {
              this.clearAccessTokenOnly();
              return of(null);
            })
          )
        ).then(() => undefined);
      }
    }
    return Promise.resolve();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  login(request: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.accessTokenSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem(AuthService.ACCESS_TOKEN_STORAGE_KEY);
    }
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    const request: RefreshTokenRequest = { refreshToken };
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  getAccessToken(): string | null {
    return this.accessTokenSubject.getValue();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  /**
   * Refreshes the in-memory user from GET /api/users/me (e.g. after profile name change).
   * Sidebar and guards use {@link #getCurrentUser}; without this, UI stays stale until re-login.
   */
  syncCurrentUserFromServer(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/api/users/me`).pipe(
      tap((u) => {
        this.currentUserSubject.next({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone ?? '',
          department: u.department,
          preferredLanguage: u.preferredLanguage,
          role: u.role,
          isActive: u.isActive ?? true,
          createdAt: u.createdAt ?? '',
          totalLoginCount: u.totalLoginCount ?? 0,
          isTwoFactorEnabled: u.isTwoFactorEnabled ?? false
        });
      })
    );
  }

  private handleAuthResponse(response: AuthResponse): void {
    const user: User = {
      id: response.userId,
      firstName: response.firstName,
      lastName: response.lastName,
      email: response.email,
      role: response.role,
      isActive: true,
      createdAt: '',
      totalLoginCount: 0,
      isTwoFactorEnabled: false,
      phone: ''
    };

    this.currentUserSubject.next(user);
    this.accessTokenSubject.next(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(AuthService.ACCESS_TOKEN_STORAGE_KEY, response.accessToken);
    }
  }
}
