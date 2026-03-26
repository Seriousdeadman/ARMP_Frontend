import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Session } from '../../models/user.models';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss'
})
export class ActivityComponent implements OnInit {

  sessions: Session[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.http.get<Session[]>(
      `${environment.apiUrl}/api/profile/sessions`
    ).subscribe({
      next: (sessions) => {
        this.sessions = sessions.sort((a, b) =>
          new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime()
        );
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load sessions.';
        this.isLoading = false;
      }
    });
  }

  revokeSession(sessionId: string): void {
    this.http.delete<void>(
      `${environment.apiUrl}/api/profile/sessions/${sessionId}`
    ).subscribe({
      next: () => {
        this.sessions = this.sessions.map(s =>
          s.id === sessionId ? { ...s, isActive: false } : s
        );
      },
      error: () => {
        this.errorMessage = 'Failed to revoke session.';
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }

  getDuration(session: Session): string {
    if (session.durationMinutes === null || session.durationMinutes === undefined) {
      return session.isActive ? 'Active now' : '—';
    }
    const hours = Math.floor(session.durationMinutes / 60);
    const minutes = session.durationMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}
