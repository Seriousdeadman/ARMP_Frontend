import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';
import { SlideOverPanelComponent } from '../../../shared/slide-over-panel/slide-over-panel.component';

@Component({
  selector: 'app-hr-admin-onboarding',
  standalone: true,
  imports: [CommonModule, SlideOverPanelComponent],
  templateUrl: './hr-admin-onboarding.component.html',
  styleUrls: ['./hr-admin-pages.shared.scss', './hr-admin-onboarding.component.scss']
})
export class HrAdminOnboardingComponent implements OnInit {
  private readonly hrService = inject(HrService);

  pendingEmployees: Employee[] = [];

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  loading = true;
  error: string | null = null;
  success: string | null = null;
  processingId: string | null = null;
  selectedEmployee: Employee | null = null;
  panelOpen = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.hrService.getPendingEmployees().subscribe({
      next: rows => {
        this.pendingEmployees = rows;
        this.loading = false;
      },
      error: e => {
        this.error = e?.error?.message ?? 'Failed to load pending employees.';
        this.loading = false;
      }
    });
  }

  openPanel(emp: Employee): void {
    this.selectedEmployee = emp;
    this.panelOpen = true;
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedEmployee = null;
  }

  activate(id: string): void {
    this.error = null;
    this.success = null;
    this.processingId = id;
    this.hrService.activateEmployee(id).subscribe({
      next: () => {
        this.processingId = null;
        this.success = 'Employee activated successfully.';
        this.closePanel();
        this.load();
      },
      error: e => {
        this.processingId = null;
        this.error = e?.error?.message ?? 'Activation failed.';
      }
    });
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'badge badge--status-active';
      case 'PENDING_VALIDATION': return 'badge badge--status-pending';
      default: return 'badge';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'PENDING_VALIDATION': return 'Pending Validation';
      default: return status;
    }
  }
}
