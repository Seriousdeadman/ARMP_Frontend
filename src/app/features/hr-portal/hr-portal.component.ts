import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ApplicationStatusResponse,
  HrService,
  LeaveSummaryResponse,
  LeaveTypeCode
} from '../../services/hr.service';
import { finalize } from 'rxjs/operators';

function portalLoadErrorMessage(err: HttpErrorResponse, fallback: string): string {
  if (err.status === 0) {
    return `${fallback} Network/CORS — is the API at ${err.url ?? 'the configured URL'} reachable? If you use 127.0.0.1:4200, the backend must allow that origin (localhost alone is not enough).`;
  }
  if (err.status === 401 || err.status === 403) {
    return `${fallback} (${err.status}). Try logging out and back in.`;
  }
  return `${fallback} (HTTP ${err.status}).`;
}

@Component({
  selector: 'app-hr-portal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hr-portal.component.html',
  styleUrl: './hr-portal.component.scss'
})
export class HrPortalComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly fb = inject(FormBuilder);

  applicationLoading = true;
  leaveLoading = true;
  applicationStatus: ApplicationStatusResponse | null = null;
  leaveSummary: LeaveSummaryResponse | null = null;

  applicationError: string | null = null;
  leaveError: string | null = null;

  leaveSubmitting = false;
  leaveSubmitMessage: string | null = null;
  leaveSubmitError: string | null = null;

  leaveTypes: { value: LeaveTypeCode; label: string }[] = [
    { value: 'ANNUAL', label: 'Annual leave' },
    { value: 'SICK', label: 'Sick leave' },
    { value: 'EXCEPTIONAL', label: 'Exceptional leave' }
  ];

  leaveForm = this.fb.nonNullable.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    type: this.fb.nonNullable.control<LeaveTypeCode>('ANNUAL', Validators.required)
  });

  ngOnInit(): void {
    this.reloadApplicationStatus();
    this.reloadLeaveSummary();
  }

  reloadApplicationStatus(): void {
    this.applicationLoading = true;
    this.applicationError = null;
    this.hr.getApplicationStatus()
      .pipe(finalize(() => { this.applicationLoading = false; }))
      .subscribe({
        next: (res) => { this.applicationStatus = res; },
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
        next: (res) => { this.leaveSummary = res; },
        error: (err: HttpErrorResponse) => {
          this.leaveError = portalLoadErrorMessage(err, 'Could not load leave balance.');
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
      type: v.type
    }).pipe(finalize(() => { this.leaveSubmitting = false; }))
      .subscribe({
        next: (res) => {
          this.leaveSubmitMessage = `Request submitted (${res.status}). Reference: ${res.id.slice(0, 8)}…`;
          this.leaveForm.patchValue({ startDate: '', endDate: '' });
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
}
