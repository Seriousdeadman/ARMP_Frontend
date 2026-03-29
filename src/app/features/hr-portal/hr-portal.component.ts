import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ApplicationStatusResponse,
  HrService,
  LeavePreviewResponse,
  LeaveSummaryResponse,
  LeaveTypeCode,
  PortalLeaveRequestRow
} from '../../services/hr.service';
import { CvFileMetadata, Department, CareersApplication } from '../../models/hr.models';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.models';
import {
  buildPortalModeContext,
  HrPortalView,
  resolveHrPortalView,
  showCareerSection,
  showEmployeeSection
} from '../../hr/hr-portal-mode';
import { debounceTime, finalize, merge } from 'rxjs';

function portalLoadErrorMessage(err: HttpErrorResponse, fallback: string): string {
  if (err.status === 0) {
    return `${fallback} Network/CORS — is the API at ${err.url ?? 'the configured URL'} reachable? If you use 127.0.0.1:4200, the backend must allow that origin (localhost alone is not enough).`;
  }
  if (err.status === 401 || err.status === 403) {
    return `${fallback} (${err.status}). Try logging out and back in.`;
  }
  return `${fallback} (HTTP ${err.status}).`;
}

function leaveStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending HR review';
    case 'APPROVED':
      return 'Approved by HR';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

function careerStepIndex(s: ApplicationStatusResponse | null): number {
  if (!s?.candidateFound) {
    return 0;
  }
  const st = (s.candidateStatus || '').toUpperCase();
  if (st === 'ACCEPTED' || st === 'REJECTED') {
    return 2;
  }
  if (s.interviewScheduledAt || st === 'INTERVIEWING') {
    return 1;
  }
  return 0;
}

@Component({
  selector: 'app-hr-portal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './hr-portal.component.html',
  styleUrl: './hr-portal.component.scss'
})
export class HrPortalComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  applicationLoading = true;
  leaveLoading = true;
  historyLoading = false;
  applicationStatus: ApplicationStatusResponse | null = null;
  leaveSummary: LeaveSummaryResponse | null = null;
  leaveHistory: PortalLeaveRequestRow[] = [];
  portalView: HrPortalView = 'career';

  applicationError: string | null = null;
  leaveError: string | null = null;
  historyError: string | null = null;

  departments: Department[] = [];
  application: CareersApplication | null = null;
  applicationSaving = false;
  applicationSaveMessage: string | null = null;
  applicationSaveError: string | null = null;

  applicationForm = this.fb.nonNullable.group({
    departmentId: ['', Validators.required],
    skillsAndExperience: ['', Validators.required]
  });

  leaveSubmitting = false;
  leaveSubmitMessage: string | null = null;
  leaveSubmitError: string | null = null;

  leavePreview: LeavePreviewResponse | null = null;
  leavePreviewError: string | null = null;

  cvMetadata: CvFileMetadata | null = null;
  cvUploading = false;
  cvMessage: string | null = null;
  cvError: string | null = null;
  cvDragOver = false;

  leaveForm = this.fb.nonNullable.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    type: this.fb.nonNullable.control<LeaveTypeCode>('ANNUAL', Validators.required),
    reason: ['', Validators.required]
  });

  readonly leaveTypeOptions: { value: LeaveTypeCode; label: string }[] = [
    { value: 'ANNUAL', label: 'Annual' },
    { value: 'SICK', label: 'Sick' },
    { value: 'EXCEPTIONAL', label: 'Exceptional' }
  ];

  readonly UserRole = UserRole;
  readonly careerStepIndex = careerStepIndex;
  readonly leaveStatusLabel = leaveStatusLabel;

  ngOnInit(): void {
    this.reloadApplicationStatus();
    this.reloadLeaveSummary();
    merge(
      this.leaveForm.controls.startDate.valueChanges,
      this.leaveForm.controls.endDate.valueChanges
    ).pipe(debounceTime(300)).subscribe(() => this.refreshLeavePreview());
  }

  get currentRole(): UserRole | undefined {
    return this.auth.getCurrentUser()?.role;
  }

  get showCareer(): boolean {
    return showCareerSection(this.portalView);
  }

  showEmployee(employeeFound: boolean): boolean {
    return showEmployeeSection(this.portalView, employeeFound);
  }

  private recomputeView(): void {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.portalView = 'career';
      return;
    }
    const ctx = buildPortalModeContext(user.role, this.leaveSummary, this.applicationStatus);
    this.portalView = resolveHrPortalView(ctx);
  }

  reloadApplicationStatus(): void {
    this.applicationLoading = true;
    this.applicationError = null;
    this.hr.getApplicationStatus()
      .pipe(finalize(() => { this.applicationLoading = false; }))
      .subscribe({
        next: (res) => {
          this.applicationStatus = res;
          this.recomputeView();
          if (this.showCareer) {
            this.loadCvMetadata();
            this.loadCareerData();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.applicationError = portalLoadErrorMessage(
            err,
            'Could not load application status.'
          );
        }
      });
  }

  reloadLeaveSummary(): void {
    this.leaveLoading = true;
    this.leaveError = null;
    this.hr.getLeaveSummary()
      .pipe(finalize(() => { this.leaveLoading = false; }))
      .subscribe({
        next: (res) => {
          this.leaveSummary = res;
          this.recomputeView();
          if (res.employeeFound) {
            this.reloadLeaveHistory();
          }
          this.refreshLeavePreview();
        },
        error: (err: HttpErrorResponse) => {
          this.leaveError = portalLoadErrorMessage(err, 'Could not load leave balance.');
        }
      });
  }

  reloadLeaveHistory(): void {
    if (!this.leaveSummary?.employeeFound) {
      return;
    }
    this.historyLoading = true;
    this.historyError = null;
    this.hr.getMyLeaveRequests()
      .pipe(finalize(() => { this.historyLoading = false; }))
      .subscribe({
        next: (rows) => { this.leaveHistory = rows; },
        error: (err: HttpErrorResponse) => {
          this.historyError = portalLoadErrorMessage(err, 'Could not load leave history.');
        }
      });
  }

  refreshLeavePreview(): void {
    this.leavePreview = null;
    this.leavePreviewError = null;
    if (!this.leaveSummary?.employeeFound) {
      return;
    }
    const start = this.leaveForm.controls.startDate.value;
    const end = this.leaveForm.controls.endDate.value;
    if (!start || !end || this.leaveForm.controls.startDate.invalid) {
      return;
    }
    this.hr.getLeavePreview(start, end).subscribe({
      next: (p) => { this.leavePreview = p; },
      error: () => {
        this.leavePreviewError = 'Could not preview balance.';
      }
    });
  }

  submitLeave(): void {
    this.leaveSubmitMessage = null;
    this.leaveSubmitError = null;
    if (this.leaveForm.invalid || !this.leaveSummary?.employeeFound) {
      this.leaveForm.markAllAsTouched();
      return;
    }
    const v = this.leaveForm.getRawValue();
    this.leaveSubmitting = true;
    this.hr.submitLeaveRequest({
      startDate: v.startDate,
      endDate: v.endDate,
      type: v.type,
      reason: v.reason
    }).pipe(finalize(() => { this.leaveSubmitting = false; }))
      .subscribe({
        next: (res) => {
          this.leaveSubmitMessage = `Request submitted (${res.status}). Reference: ${res.id.slice(0, 8)}…`;
          this.leaveForm.patchValue({
            startDate: '',
            endDate: '',
            type: 'ANNUAL',
            reason: ''
          });
          this.leavePreview = null;
          this.reloadLeaveSummary();
          this.reloadLeaveHistory();
        },
        error: (err: HttpErrorResponse) => {
          const body = err.error;
          const fromBody =
            body && typeof body === 'object' && 'message' in body
              ? String((body as { message: unknown }).message)
              : null;
          this.leaveSubmitError = fromBody || err.message || 'Request failed.';
        }
      });
  }

  loadCvMetadata(): void {
    this.hr.getMyApplicationCvFileMetadata().subscribe({
      next: (m) => { this.cvMetadata = m; },
      error: () => { this.cvMetadata = null; }
    });
  }

  onCvFileSelected(file: File | null): void {
    if (!file) {
      return;
    }
    this.cvUploading = true;
    this.cvMessage = null;
    this.cvError = null;
    this.hr.uploadMyApplicationCvFile(file)
      .pipe(finalize(() => { this.cvUploading = false; }))
      .subscribe({
        next: (m) => {
          this.cvMetadata = m;
          this.cvMessage = 'CV uploaded.';
        },
        error: (err: HttpErrorResponse) => {
          const msg =
            err.error && typeof err.error === 'object' && 'message' in err.error
              ? String((err.error as { message: unknown }).message)
              : null;
          this.cvError = msg || err.message || 'Upload failed.';
        }
      });
  }

  onCvInputChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.onCvFileSelected(file);
    input.value = '';
  }

  onCvDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.cvDragOver = false;
    const file = ev.dataTransfer?.files?.[0];
    if (file) {
      this.onCvFileSelected(file);
    }
  }

  onCvDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.cvDragOver = true;
  }

  onCvDragLeave(): void {
    this.cvDragOver = false;
  }

  downloadCvFile(): void {
    this.hr.downloadMyApplicationCvFile().subscribe({
      next: (blob) => {
        const fileName = this.cvMetadata?.fileName || 'cv-file';
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error;
        const msg = body && typeof body === 'object' && 'message' in body ? String((body as any).message) : null;
        this.cvError = msg || err.message || 'Could not download CV file.';
      }
    });
  }

  loadCareerData(): void {
    this.hr.listCareerDepartments().subscribe({
      next: (deps) => this.departments = deps,
      error: () => {}
    });
    this.hr.getMyApplication().subscribe({
      next: (app) => {
        this.application = app;
        if (app) {
          this.applicationForm.patchValue({
            departmentId: app.departmentId || '',
            skillsAndExperience: app.skillsAndExperience || ''
          });
        }
      },
      error: () => {}
    });
  }

  saveApplication(): void {
    this.applicationSaveMessage = null;
    this.applicationSaveError = null;
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      return;
    }
    this.applicationSaving = true;
    this.hr.saveMyApplication({
      departmentId: this.applicationForm.value.departmentId!,
      skillsAndExperience: this.applicationForm.value.skillsAndExperience!
    }).pipe(finalize(() => { this.applicationSaving = false; }))
      .subscribe({
        next: (app) => {
          this.application = app;
          this.applicationSaveMessage = 'Application saved.';
          this.reloadApplicationStatus();
        },
        error: (err: HttpErrorResponse) => {
          const body = err.error;
          const fromBody = body && typeof body === 'object' && 'message' in body ? String((body as any).message) : null;
          this.applicationSaveError = fromBody || err.message || 'Save failed.';
        }
      });
  }
}
