import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Candidate, Interview, InterviewRequest, InterviewStatus } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';

@Component({
  selector: 'app-hr-admin-interviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-interviews.component.html',
  styleUrl: './hr-admin-pages.shared.scss'
})
export class HrAdminInterviewsComponent implements OnInit, OnDestroy {
  private readonly hrService = inject(HrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private routeSub: Subscription | null = null;

  interviews: Interview[] = [];
  candidates: Candidate[] = [];
  statuses: InterviewStatus[] = ['PLANNED', 'COMPLETED', 'CANCELED'];
  searchQuery = '';
  statusFilter: InterviewStatus | 'ALL' = 'ALL';
  candidateFilterId = 'ALL';
  selectedId = '';
  form: InterviewRequest = { interviewDate: '', location: '', score: null, status: 'PLANNED', candidateId: '' };
  error: string | null = null;
  loading = false;

  ngOnInit(): void {
    this.reload();
    this.hrService.listCandidates().subscribe({
      next: v => {
        this.candidates = v;
        this.applyCandidateQueryParam();
      }
    });
    this.routeSub = this.route.queryParamMap
      .pipe(
        map(p => p.get('candidateId')?.trim() ?? ''),
        filter(id => id.length > 0)
      )
      .subscribe(() => {
        if (this.candidates.length > 0) {
          this.applyCandidateQueryParam();
        }
      });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private applyCandidateQueryParam(): void {
    const id = this.route.snapshot.queryParamMap.get('candidateId')?.trim();
    if (!id) {
      return;
    }
    const exists = this.candidates.some(c => c.id === id);
    if (!exists) {
      return;
    }
    this.selectedId = '';
    this.form = {
      interviewDate: '',
      location: '',
      score: null,
      status: 'PLANNED',
      candidateId: id
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { candidateId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  reload(): void {
    this.loading = true;
    this.hrService.listInterviews().subscribe({
      next: v => {
        this.interviews = v;
        this.loading = false;
      },
      error: (e: HttpErrorResponse) => {
        this.loading = false;
        this.error = e?.error?.message ?? 'Could not load interviews';
      }
    });
  }

  pick(id: string): void {
    this.selectedId = id;
    const it = this.interviews.find(i => i.id === id);
    if (!it) return;
    this.form = {
      interviewDate: this.toDatetimeLocalValue(it.interviewDate),
      location: it.location,
      score: it.score ?? null,
      status: it.status,
      candidateId: it.candidate.id
    };
  }

  startNew(): void {
    this.selectedId = '';
    this.form = { interviewDate: '', location: '', score: null, status: 'PLANNED', candidateId: '' };
  }

  create(): void {
    if (!this.validateForm()) { return; }
    this.error = null;
    this.hrService.createInterview(this.form).subscribe({
      next: () => {
        this.startNew();
        this.reload();
      },
      error: e => this.error = e?.error?.message ?? 'Create failed'
    });
  }

  update(): void {
    if (!this.selectedId) { this.error = 'Select interview first'; return; }
    if (!this.validateForm()) { return; }
    this.error = null;
    this.hrService.updateInterview(this.selectedId, this.form).subscribe({ next: () => this.reload(), error: e => this.error = e?.error?.message ?? 'Update failed' });
  }

  remove(): void {
    if (!this.selectedId) { this.error = 'Select interview first'; return; }
    this.error = null;
    this.hrService.deleteInterview(this.selectedId).subscribe({ next: () => { this.selectedId = ''; this.reload(); }, error: e => this.error = e?.error?.message ?? 'Delete failed' });
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

  get filteredInterviews(): Interview[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.interviews.filter(interview => {
      const searchMatch = !query
        || interview.candidate.name.toLowerCase().includes(query)
        || interview.location.toLowerCase().includes(query)
        || interview.status.toLowerCase().includes(query);
      const statusMatch = this.statusFilter === 'ALL' || interview.status === this.statusFilter;
      const candidateMatch = this.candidateFilterId === 'ALL' || interview.candidate.id === this.candidateFilterId;
      return searchMatch && statusMatch && candidateMatch;
    });
  }

  private validateForm(): boolean {
    if (!this.form.candidateId) {
      this.error = 'Candidate is required.';
      return false;
    }
    if (!this.form.interviewDate) {
      this.error = 'Interview date and time are required.';
      return false;
    }
    if (!this.form.location.trim()) {
      this.error = 'Location is required.';
      return false;
    }
    const score = this.form.score;
    if (score != null && (score < 0 || score > 20)) {
      this.error = 'Score must be between 0 and 20.';
      return false;
    }
    return true;
  }
}
