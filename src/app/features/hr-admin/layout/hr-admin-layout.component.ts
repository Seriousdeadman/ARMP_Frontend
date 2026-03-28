import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/user.models';

@Component({
  selector: 'app-hr-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './hr-admin-layout.component.html',
  styleUrl: './hr-admin-layout.component.scss'
})
export class HrAdminLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser = computed(() => this.authService.getCurrentUser());

  readonly baseLinks = [
    { label: 'Overview', route: '/app/hr/admin/overview' },
    { label: 'Candidates + CV', route: '/app/hr/admin/candidates' },
    { label: 'Interviews', route: '/app/hr/admin/interviews' },
    { label: 'Employees + Salary', route: '/app/hr/admin/employees' },
    { label: 'Leave Requests', route: '/app/hr/admin/leaves' }
  ];

  readonly superOnlyLinks = [
    { label: 'Grades', route: '/app/hr/admin/grades' },
    { label: 'Departments', route: '/app/hr/admin/departments' }
  ];

  get links() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return this.baseLinks;
    }
    return user.role === UserRole.SUPER_ADMIN
      ? [...this.baseLinks, ...this.superOnlyLinks]
      : this.baseLinks;
  }
}
