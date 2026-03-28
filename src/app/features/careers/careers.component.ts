import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { HrService } from '../../services/hr.service';
import { ApplicationStatusResponse } from '../../services/hr.service';
import { CareersApplication, CvFileMetadata, Department } from '../../models/hr.models';

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss'
})
export class CareersComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly fb = inject(FormBuilder);

  loading = true;
  saving = false;
  uploading = false;

  applicationStatus: ApplicationStatusResponse | null = null;
  application: CareersApplication | null = null;
  cvMetadata: CvFileMetadata | null = null;
  departments: Department[] = [];

  pageError: string | null = null;
  saveMessage: string | null = null;
  saveError: string | null = null;
  cvMessage: string | null = null;
  cvError: string | null = null;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    departmentId: ['', Validators.required],
    skillsAndExperience: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.pageError = null;
    this.hr.listCareerDepartments()
      .subscribe({
        next: (departments) => {
          this.departments = departments;
          this.loadApplicationData();
        },
        error: () => {
          this.loading = false;
          this.pageError = 'Could not load departments for careers.';
        }
      });
  }

  saveApplication(): void {
    this.saveMessage = null;
    this.saveError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.hr.saveMyApplication(this.form.getRawValue())
      .pipe(finalize(() => { this.saving = false; }))
      .subscribe({
        next: (application) => {
          this.application = application;
          this.saveMessage = 'Application saved successfully.';
          this.loadStatusAndCv();
        },
        error: (err: HttpErrorResponse) => {
          this.saveError = this.resolveError(err, 'Could not save application.');
        }
      });
  }

  onCvFileSelected(event: Event): void {
    this.cvMessage = null;
    this.cvError = null;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    this.hr.uploadMyApplicationCvFile(file)
      .pipe(finalize(() => { this.uploading = false; }))
      .subscribe({
        next: (metadata) => {
          this.cvMetadata = metadata;
          this.cvMessage = 'CV file uploaded.';
        },
        error: (err: HttpErrorResponse) => {
          this.cvError = this.resolveError(err, 'Could not upload CV file.');
        }
      });
    input.value = '';
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
        this.cvError = this.resolveError(err, 'Could not download CV file.');
      }
    });
  }

  deleteCvFile(): void {
    this.cvMessage = null;
    this.cvError = null;
    this.hr.deleteMyApplicationCvFile().subscribe({
      next: (metadata) => {
        this.cvMetadata = metadata;
        this.cvMessage = 'CV file removed.';
      },
      error: (err: HttpErrorResponse) => {
        this.cvError = this.resolveError(err, 'Could not remove CV file.');
      }
    });
  }

  private loadApplicationData(): void {
    this.hr.getMyApplication()
      .subscribe({
        next: (application) => {
          this.application = application;
          if (application) {
            this.form.patchValue({
              name: application.name,
              phone: application.phone,
              departmentId: application.departmentId,
              skillsAndExperience: application.skillsAndExperience
            });
          }
          this.loadStatusAndCv();
        },
        error: () => {
          this.loading = false;
          this.pageError = 'Could not load your application.';
        }
      });
  }

  private loadStatusAndCv(): void {
    this.hr.getApplicationStatus().subscribe({
      next: (status) => { this.applicationStatus = status; },
      error: () => { this.applicationStatus = null; }
    });
    this.hr.getMyApplicationCvFileMetadata()
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (metadata) => { this.cvMetadata = metadata; },
        error: () => { this.cvMetadata = null; }
      });
  }

  private resolveError(err: HttpErrorResponse, fallback: string): string {
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      return String((body as { message: unknown }).message);
    }
    return err.message || fallback;
  }
}
