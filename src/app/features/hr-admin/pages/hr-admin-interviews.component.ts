import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import {
  Candidate,
  Employee,
  Interview,
  InterviewRequest,
  InterviewStatus
} from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';
import { SlideOverPanelComponent } from '../../../shared/slide-over-panel/slide-over-panel.component';

@Component({
  selector: 'app-hr-admin-interviews',
  standalone: true,
  imports: [CommonModule, FormsModule, SlideOverPanelComponent],
  templateUrl: './hr-admin-interviews.component.html',
  styleUrls: ['./hr-admin-pages.shared.scss', './hr-admin-interviews.component.scss']
})
export class HrAdminInterviewsComponent implements OnInit, OnDestroy {
  private readonly hrService = inject(HrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private routeSub: Subscription | null = null;
  private successClearTimer: ReturnType<typeof setTimeout> | null = null;

  interviews: Interview[] = [];
  candidates: Candidate[] = [];
  employees: Employee[] = [];
  statuses: InterviewStatus[] = ['PLANNED', 'COMPLETED', 'CANCELED'];
  searchQuery = '';
  statusFilter: InterviewStatus | 'ALL' = 'ALL';
  candidateFilterId = 'ALL';
  error: string | null = null;
  success: string | null = null;
  isLoading = false;
  panelOpen = false;
  editingId: string | null = null;
  selectedRowId: string | null = null;
  pendingOpenFromQuery = false;

  form: InterviewRequest = emptyInterviewForm();

  readonly statusLabels: Record<InterviewStatus, string> = {
    PLANNED: 'Scheduled',
    COMPLETED: 'Completed',
    CANCELED: 'Canceled'
  };

  ngOnInit(): void {
    this.reloadInterviews();
    this.hrService.listEmployees().subscribe({
      next: v => {
        this.employees = v;
        this.tryApplyCandidateQueryParam();
      },
      error: () => {
        this.employees = [];
        this.tryApplyCandidateQueryParam();
      }
    });
    this.hrService.listCandidates({ excludePromoted: true }).subscribe({
      next: v => {
        this.candidates = v;
        this.tryApplyCandidateQueryParam();
      },
      error: () => {
        this.candidates = [];
      }
    });
    this.routeSub = this.route.queryParamMap
      .pipe(
        map(p => p.get('candidateId')?.trim() ?? ''),
        filter(id => id.length > 0)
      )
      .subscribe(() => {
        this.pendingOpenFromQuery = true;
        this.tryApplyCandidateQueryParam();
      });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.successClearTimer) {
      clearTimeout(this.successClearTimer);
    }
  }

  get activeEmployees(): Employee[] {
    return this.employees.filter(e => e.status === 'ACTIVE');
  }

  private tryApplyCandidateQueryParam(): void {
    if (!this.pendingOpenFromQuery && !this.route.snapshot.queryParamMap.get('candidateId')) {
      return;
    }
    const id = this.route.snapshot.queryParamMap.get('candidateId')?.trim();
    if (!id) {
      return;
    }
    const exists = this.candidates.some(c => c.id === id);
    if (!exists) {
      return;
    }
    this.pendingOpenFromQuery = false;
    this.openNew();
    this.form.candidateId = id;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { candidateId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  reloadInterviews(): void {
    this.isLoading = true;
    this.error = null;
    this.hrService.listInterviews().subscribe({
      next: v => {
        this.interviews = v;
        this.isLoading = false;
      },
      error: (e: HttpErrorResponse) => {
        this.isLoading = false;
        this.error = e?.error?.message ?? 'Could not load interviews';
      }
    });
  }

  openNew(): void {
    this.clearMessages();
    this.editingId = null;
    this.selectedRowId = null;
    this.form = emptyInterviewForm();
    this.panelOpen = true;
  }

  openEdit(row: Interview): void {
    this.clearMessages();
    this.editingId = row.id;
    this.selectedRowId = row.id;
    this.form = {
      interviewDate: this.toDatetimeLocalValue(row.interviewDate),
      location: row.location,
      score: row.status === 'COMPLETED' ? (row.score ?? null) : null,
      status: row.status,
      candidateId: row.candidate.id,
      interviewerId: row.interviewer?.id ?? ''
    };
    this.panelOpen = true;
  }

  closePanel(): void {
    this.panelOpen = false;
    this.editingId = null;
    this.selectedRowId = null;
  }

  submitPanel(): void {
    if (!this.validateForm()) {
      return;
    }
    this.error = null;
    const payload = this.buildPayload();
    if (this.editingId) {
      this.hrService.updateInterview(this.editingId, payload).subscribe({
        next: () => {
          this.setSuccess('Interview updated.');
          this.closePanel();
          this.reloadInterviews();
        },
        error: e => (this.error = e?.error?.message ?? 'Update failed')
      });
    } else {
      this.hrService.createInterview(payload).subscribe({
        next: () => {
          this.setSuccess('Interview scheduled.');
          this.closePanel();
          this.reloadInterviews();
        },
        error: e => (this.error = e?.error?.message ?? 'Create failed')
      });
    }
  }

  confirmDelete(row: Interview): void {
    const ok = window.confirm(
      `Delete interview for ${row.candidate.name} on ${row.interviewDate}?`
    );
    if (!ok) {
      return;
    }
    this.error = null;
    this.hrService.deleteInterview(row.id).subscribe({
      next: () => {
        this.setSuccess('Interview removed.');
        if (this.editingId === row.id) {
          this.closePanel();
        }
        this.reloadInterviews();
      },
      error: e => (this.error = e?.error?.message ?? 'Delete failed')
    });
  }

  statusLabel(s: InterviewStatus): string {
    return this.statusLabels[s] ?? s;
  }

  displayScore(row: Interview): string {
    if (row.status !== 'COMPLETED') {
      return '—';
    }
    return row.score != null ? String(row.score) : '—';
  }

  get filteredInterviews(): Interview[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.interviews.filter(interview => {
      const interviewerName = interview.interviewer?.name?.toLowerCase() ?? '';
      const searchMatch =
        !query ||
        interview.candidate.name.toLowerCase().includes(query) ||
        interview.location.toLowerCase().includes(query) ||
        interview.status.toLowerCase().includes(query) ||
        interviewerName.includes(query);
      const statusMatch =
        this.statusFilter === 'ALL' || interview.status === this.statusFilter;
      const candidateMatch =
        this.candidateFilterId === 'ALL' ||
        interview.candidate.id === this.candidateFilterId;
      return searchMatch && statusMatch && candidateMatch;
    });
  }

  onStatusChange(): void {
    if (this.form.status !== 'COMPLETED') {
      this.form.score = null;
    }
  }

  private buildPayload(): InterviewRequest {
    const score =
      this.form.status === 'COMPLETED' ? (this.form.score ?? null) : null;
    return {
      interviewDate: this.form.interviewDate,
      location: this.form.location.trim(),
      score,
      status: this.form.status,
      candidateId: this.form.candidateId,
      interviewerId: this.form.interviewerId
    };
  }

  private validateForm(): boolean {
    if (!this.form.interviewerId) {
      this.error = 'Select an interviewer.';
      return false;
    }
    if (!this.form.candidateId) {
      this.error = 'Select a candidate.';
      return false;
    }
    if (!this.form.interviewDate) {
      this.error = 'Date and time are required.';
      return false;
    }
    if (!this.form.location.trim()) {
      this.error = 'Location is required.';
      return false;
    }
    if (this.form.status === 'COMPLETED') {
      const sc = this.form.score;
      if (sc != null && (sc < 0 || sc > 20)) {
        this.error = 'Score must be between 0 and 20.';
        return false;
      }
    }
    return true;
  }

  private toDatetimeLocalValue(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const hh = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  private clearMessages(): void {
    this.error = null;
    this.success = null;
    if (this.successClearTimer) {
      clearTimeout(this.successClearTimer);
      this.successClearTimer = null;
    }
  }

  private setSuccess(msg: string): void {
    this.success = msg;
    if (this.successClearTimer) {
      clearTimeout(this.successClearTimer);
    }
    this.successClearTimer = setTimeout(() => {
      this.success = null;
      this.successClearTimer = null;
    }, 5000);
  }
}

function emptyInterviewForm(): InterviewRequest {
  return {
    interviewDate: '',
    location: '',
    score: null,
    status: 'PLANNED',
    candidateId: '',
    interviewerId: ''
  };
}
