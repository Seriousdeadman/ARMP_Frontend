import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Session } from '../../models/user.models';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { ToastService } from '../../services/toast.service';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  page: string;
  method: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss'
})
export class ActivityComponent implements OnInit {

  sessions: Session[] = [];
  auditLogs: AuditLog[] = [];
  isLoadingSessions = true;
  isLoadingLogs = true;
  activeTab: 'sessions' | 'logs' = 'sessions';

  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.loadAuditLogs();
  }

  loadSessions(): void {
    this.http.get<Session[]>(
      `${environment.apiUrl}/api/profile/sessions`
    ).subscribe({
      next: (sessions) => {
        this.sessions = sessions.sort((a, b) =>
          new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime()
        );
        this.isLoadingSessions = false;
      },
      error: () => {
        this.toastService.error('Failed to load sessions.');
        this.isLoadingSessions = false;
      }
    });
  }

  loadAuditLogs(): void {
    this.http.get<AuditLog[]>(
      `${environment.apiUrl}/api/audit/my-logs`
    ).subscribe({
      next: (logs) => {
        this.auditLogs = logs;
        this.isLoadingLogs = false;
      },
      error: () => {
        this.toastService.error('Failed to load activity logs.');
        this.isLoadingLogs = false;
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
        this.toastService.success('Session revoked.');
      },
      error: () => {
        this.toastService.error('Failed to revoke session.');
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

  setTab(tab: 'sessions' | 'logs'): void {
    this.activeTab = tab;
  }
}
