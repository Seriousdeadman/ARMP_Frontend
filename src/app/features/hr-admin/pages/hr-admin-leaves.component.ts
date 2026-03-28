import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveRequest, LeaveRequestStatus, LeaveType } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hr-admin-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-leaves.component.html',
  styleUrl: './hr-admin-pages.shared.scss'
})
export class HrAdminLeavesComponent implements OnInit {
  private readonly hrService = inject(HrService);
  private readonly authService = inject(AuthService);

  pendingLeaves: LeaveRequest[] = [];
  historicalLeaves: LeaveRequest[] = [];
  searchQuery = '';
  statusFilter: LeaveRequestStatus | 'ALL' = 'ALL';
  typeFilter: LeaveType | 'ALL' = 'ALL';
  adminPassword = '';
  error: string | null = null;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const currentEmail = this.authService.getCurrentUser()?.email?.toLowerCase();
    this.hrService.listLeaveRequests().subscribe({
      next: v => {
        const visibleLeaves = v.filter(l => {
          const isOwnLeave = (l.employee?.email ?? '').toLowerCase() === (currentEmail ?? '');
          return !isOwnLeave;
        });
        this.pendingLeaves = visibleLeaves.filter(l => l.status === 'PENDING');
        this.historicalLeaves = visibleLeaves.filter(l => l.status !== 'PENDING');
      }
    });
  }

  approve(id: string): void {
    const password = this.resolveAdminPassword();
    if (!password) {
      this.error = 'Admin password is required to approve/reject.';
      return;
    }
    const leave = this.pendingLeaves.find(l => l.id === id);
    if (!leave || leave.status !== 'PENDING') {
      this.error = 'Only pending leave requests can be approved.';
      return;
    }
    this.error = null;
    this.adminPassword = password;
    this.hrService.approveLeave(id, password).subscribe({
      next: () => this.reload(),
      error: e => {
        if (e?.status === 403) {
          this.error = 'Invalid admin password. Please re-enter your current password.';
          return;
        }
        this.error = e?.error?.message ?? 'Approve failed';
      }
    });
  }

  reject(id: string): void {
    const password = this.resolveAdminPassword();
    if (!password) {
      this.error = 'Admin password is required to approve/reject.';
      return;
    }
    const leave = this.pendingLeaves.find(l => l.id === id);
    if (!leave || leave.status !== 'PENDING') {
      this.error = 'Only pending leave requests can be rejected.';
      return;
    }
    this.error = null;
    this.adminPassword = password;
    this.hrService.rejectLeave(id, password).subscribe({
      next: () => this.reload(),
      error: e => {
        if (e?.status === 403) {
          this.error = 'Invalid admin password. Please re-enter your current password.';
          return;
        }
        this.error = e?.error?.message ?? 'Reject failed';
      }
    });
  }

  get filteredPendingLeaves(): LeaveRequest[] {
    return this.pendingLeaves.filter(leave => this.matchesLeaveFilters(leave));
  }

  get filteredHistoricalLeaves(): LeaveRequest[] {
    return this.historicalLeaves.filter(leave => this.matchesLeaveFilters(leave));
  }

  private matchesLeaveFilters(leave: LeaveRequest): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    const searchMatch = !query
      || leave.employee.name.toLowerCase().includes(query)
      || leave.employee.email.toLowerCase().includes(query)
      || leave.type.toLowerCase().includes(query)
      || leave.status.toLowerCase().includes(query);
    const statusMatch = this.statusFilter === 'ALL' || leave.status === this.statusFilter;
    const typeMatch = this.typeFilter === 'ALL' || leave.type === this.typeFilter;
    return searchMatch && statusMatch && typeMatch;
  }

  private resolveAdminPassword(): string | null {
    if (this.adminPassword.trim()) {
      return this.adminPassword.trim();
    }
    const entered = window.prompt('Enter your current admin password to continue:');
    return entered && entered.trim() ? entered.trim() : null;
  }
}
