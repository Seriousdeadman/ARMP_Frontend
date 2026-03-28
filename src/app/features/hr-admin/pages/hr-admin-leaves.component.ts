import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Employee, LeaveRequest, LeaveRequestStatus, LeaveType } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hr-admin-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-leaves.component.html',
  styleUrls: ['./hr-admin-pages.shared.scss', './hr-admin-leaves.component.scss']
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
  selectedLeave: LeaveRequest | null = null;
  contextEmployee: Employee | null = null;
  contextLoading = false;

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
        if (this.selectedLeave) {
          const still = visibleLeaves.find(x => x.id === this.selectedLeave!.id);
          if (still) {
            this.selectLeave(still);
          } else {
            this.selectedLeave = null;
            this.contextEmployee = null;
          }
        }
      }
    });
  }

  selectLeave(leave: LeaveRequest): void {
    this.selectedLeave = leave;
    this.contextLoading = true;
    this.contextEmployee = null;
    this.hrService.getEmployee(leave.employee.id)
      .pipe(finalize(() => { this.contextLoading = false; }))
      .subscribe({
        next: emp => this.contextEmployee = emp,
        error: () => {
          this.contextEmployee = null;
        }
      });
  }

  approve(id: string): void {
    const password = this.adminPassword.trim();
    if (!password) {
      this.error = 'Enter your current password in the field above to approve or reject.';
      return;
    }
    const leave = this.pendingLeaves.find(l => l.id === id);
    if (!leave || leave.status !== 'PENDING') {
      this.error = 'Only pending leave requests can be approved.';
      return;
    }
    this.error = null;
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
    const password = this.adminPassword.trim();
    if (!password) {
      this.error = 'Enter your current password in the field above to approve or reject.';
      return;
    }
    const leave = this.pendingLeaves.find(l => l.id === id);
    if (!leave || leave.status !== 'PENDING') {
      this.error = 'Only pending leave requests can be rejected.';
      return;
    }
    this.error = null;
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
}
