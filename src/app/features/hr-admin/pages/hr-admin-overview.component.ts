import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { CandidateRecruitmentRow, EmployeeDirectoryRow, LeaveRequestPendingRow } from '../../../models/hr.models';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hr-admin-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-overview.component.html',
  styleUrl: './hr-admin-pages.shared.scss'
})
export class HrAdminOverviewComponent implements OnInit {
  private readonly hrService = inject(HrService);
  private readonly authService = inject(AuthService);

  candidates: CandidateRecruitmentRow[] = [];
  pendingLeaves: LeaveRequestPendingRow[] = [];
  employees: EmployeeDirectoryRow[] = [];
  candidateSearchQuery = '';
  pendingLeaveSearchQuery = '';
  employeeSearchQuery = '';
  error: string | null = null;
  adminPassword = '';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const currentEmail = this.authService.getCurrentUser()?.email?.toLowerCase();
    this.hrService.listRecruitmentCandidates().subscribe({ next: v => this.candidates = v });
    this.hrService.listPendingLeaveRequests().subscribe({
      next: v => {
        this.pendingLeaves = v.filter(l => l.employeeEmail.toLowerCase() !== (currentEmail ?? ''));
      }
    });
    this.hrService.listEmployeeDirectory().subscribe({ next: v => this.employees = v });
  }

  hire(candidateId: string): void {
    this.error = null;
    this.hrService.promoteCandidate(candidateId).subscribe({
      next: () => this.reload(),
      error: err => this.error = err?.error?.message ?? 'Hire failed'
    });
  }

  approve(id: string): void {
    const password = this.resolveAdminPassword();
    if (!password) {
      this.error = 'Admin password is required to approve or reject leave requests.';
      return;
    }
    this.error = null;
    this.adminPassword = password;
    this.hrService.approveLeave(id, password).subscribe({
      next: () => this.reload(),
      error: err => {
        if (err?.status === 403) {
          this.error = 'Invalid admin password. Please re-enter your current password.';
          return;
        }
        this.error = err?.error?.message ?? 'Approve failed';
      }
    });
  }

  reject(id: string): void {
    const password = this.resolveAdminPassword();
    if (!password) {
      this.error = 'Admin password is required to approve or reject leave requests.';
      return;
    }
    this.error = null;
    this.adminPassword = password;
    this.hrService.rejectLeave(id, password).subscribe({
      next: () => this.reload(),
      error: err => {
        if (err?.status === 403) {
          this.error = 'Invalid admin password. Please re-enter your current password.';
          return;
        }
        this.error = err?.error?.message ?? 'Reject failed';
      }
    });
  }

  private resolveAdminPassword(): string | null {
    const p = this.adminPassword.trim();
    return p ? p : null;
  }

  get filteredCandidates(): CandidateRecruitmentRow[] {
    const query = this.candidateSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.candidates;
    }
    return this.candidates.filter(candidate =>
      candidate.name.toLowerCase().includes(query)
      || candidate.status.toLowerCase().includes(query)
      || (candidate.departmentName ?? '').toLowerCase().includes(query)
      || candidate.email.toLowerCase().includes(query)
    );
  }

  get filteredPendingLeaves(): LeaveRequestPendingRow[] {
    const query = this.pendingLeaveSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.pendingLeaves;
    }
    return this.pendingLeaves.filter(leave =>
      leave.employeeName.toLowerCase().includes(query)
      || leave.employeeEmail.toLowerCase().includes(query)
      || leave.type.toLowerCase().includes(query)
      || leave.status.toLowerCase().includes(query)
    );
  }

  get filteredEmployees(): EmployeeDirectoryRow[] {
    const query = this.employeeSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.employees;
    }
    return this.employees.filter(employee =>
      employee.name.toLowerCase().includes(query)
      || employee.email.toLowerCase().includes(query)
      || employee.departmentName.toLowerCase().includes(query)
      || employee.gradeName.toLowerCase().includes(query)
    );
  }
}
