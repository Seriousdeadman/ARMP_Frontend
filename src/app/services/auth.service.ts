import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { AuthRequest, AuthResponse, RegisterRequest, RefreshTokenRequest } from '../models/auth.models';
import { User } from '../models/user.models';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/auth`;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private accessTokenSubject = new BehaviorSubject<string | null>(null);

  currentUser$ = this.currentUserSubject.asObservable();
  isLoggedIn$ = this.currentUser$.pipe(
    map(user => user !== null)
  );
  private platformId = inject(PLATFORM_ID);
  constructor(private http: HttpClient, ) {}

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
    }
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    const request: RefreshTokenRequest = { refreshToken: refreshToken! };
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
  }
}
