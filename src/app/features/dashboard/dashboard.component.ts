import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { UserStatistics, Session } from '../../models/user.models';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.models';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  currentUser: User | null = null;
  stats: UserStatistics | null = null;
  recentSessions: Session[] = [];
  isLoading = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStats();
    this.loadRecentSessions();
  }

  loadStats(): void {
    this.http.get<UserStatistics>(
      `${environment.apiUrl}/api/profile/stats`
    ).subscribe({
      next: (stats) => this.stats = stats,
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  loadRecentSessions(): void {
    this.http.get<Session[]>(
      `${environment.apiUrl}/api/profile/sessions`
    ).subscribe({
      next: (sessions) => {
        this.recentSessions = sessions.slice(0, 5);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load sessions', err);
        this.isLoading = false;
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
}
