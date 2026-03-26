import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { User } from '../../models/user.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {

  users: User[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<User[]>(
      `${environment.apiUrl}/api/users`
    ).subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load users.';
        this.isLoading = false;
      }
    });
  }

  deactivateUser(userId: string): void {
    this.http.delete<void>(
      `${environment.apiUrl}/api/users/${userId}`
    ).subscribe({
      next: () => {
        this.users = this.users.map(u =>
          u.id === userId ? { ...u, isActive: false } : u
        );
      },
      error: () => {
        this.errorMessage = 'Failed to deactivate user.';
      }
    });
  }
}
