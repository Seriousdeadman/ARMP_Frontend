import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Candidate, CandidateStatus, CvFileMetadata, Department } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';

@Component({
  selector: 'app-hr-admin-candidates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-candidates.component.html',
  styleUrl: './hr-admin-pages.shared.scss'
})
export class HrAdminCandidatesComponent implements OnInit {
  private readonly hrService = inject(HrService);
  candidates: Candidate[] = [];
  departments: Department[] = [];
  selectedId = '';
  cvMeta: CvFileMetadata | null = null;
  selectedFile: File | null = null;
  readonly statuses: Array<CandidateStatus | 'ALL'> = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'];
  selectedStatus: CandidateStatus | 'ALL' = 'ALL';
  selectedDepartmentId = 'ALL';
  hasCvFilter: 'ALL' | 'YES' | 'NO' = 'ALL';
  onlyUploadedCvs = false;
  searchQuery = '';
  isLoading = false;
  error: string | null = null;
  info: string | null = null;

  ngOnInit(): void {
    this.reload();
    this.hrService.listDepartments().subscribe({
      next: rows => this.departments = rows,
      error: () => this.departments = []
    });
  }

  reload(): void {
    this.clear();
    this.isLoading = true;
    this.hrService.listCandidates().subscribe({
      next: rows => {
        this.candidates = rows;
        this.isLoading = false;
      },
      error: err => {
        this.error = err?.error?.message ?? 'Failed to load candidates';
        this.isLoading = false;
      }
    });
  }

  selectCandidate(id: string): void {
    this.selectedId = id;
    this.cvMeta = null;
    this.clear();
    this.hrService.getCandidateCvFileMetadata(id).subscribe({
      next: meta => this.cvMeta = meta,
      error: err => this.error = err?.error?.message ?? 'Failed to load CV file metadata'
    });
  }

  openCvForCandidate(candidateId: string): void {
    this.clear();
    this.hrService.downloadCandidateCvFile(candidateId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        URL.revokeObjectURL(url);
      },
      error: err => this.error = err?.error?.message ?? 'Open CV failed'
    });
  }

  get filteredCandidates(): Candidate[] {
    return this.candidates.filter(candidate => {
      const query = this.searchQuery.trim().toLowerCase();
      const matchesSearch = !query
        || candidate.name.toLowerCase().includes(query)
        || candidate.email.toLowerCase().includes(query)
        || candidate.phone.toLowerCase().includes(query)
        || candidate.department?.name?.toLowerCase().includes(query);
      const statusMatch = this.selectedStatus === 'ALL' || candidate.status === this.selectedStatus;
      const departmentMatch = this.selectedDepartmentId === 'ALL' || candidate.department?.id === this.selectedDepartmentId;
      const hasCvFile = !!candidate.cv?.fileName;
      const hasCvText = !!candidate.cv?.skillsAndExperience?.trim();
      const hasAnyCv = hasCvFile || hasCvText;
      const hasCvMatch = this.hasCvFilter === 'ALL'
        || (this.hasCvFilter === 'YES' && hasAnyCv)
        || (this.hasCvFilter === 'NO' && !hasAnyCv);
      const uploadedOnlyMatch = !this.onlyUploadedCvs || hasCvFile;
      return matchesSearch && statusMatch && departmentMatch && hasCvMatch && uploadedOnlyMatch;
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.item(0) ?? null;
  }

  uploadCv(): void {
    if (!this.selectedId || !this.selectedFile) { this.error = 'Select candidate and file'; return; }
    this.clear();
    this.hrService.uploadCandidateCvFile(this.selectedId, this.selectedFile).subscribe({
      next: meta => {
        this.cvMeta = meta;
        this.info = 'CV file uploaded';
        this.reload();
      },
      error: err => this.error = err?.error?.message ?? 'Upload failed'
    });
  }

  downloadCv(): void {
    if (!this.selectedId) { this.error = 'Select candidate first'; return; }
    this.hrService.downloadCandidateCvFile(this.selectedId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        URL.revokeObjectURL(url);
      },
      error: err => this.error = err?.error?.message ?? 'Download failed'
    });
  }

  deleteCv(): void {
    if (!this.selectedId) { this.error = 'Select candidate first'; return; }
    this.clear();
    this.hrService.deleteCandidateCvFile(this.selectedId).subscribe({
      next: meta => {
        this.cvMeta = meta;
        this.info = 'CV file deleted';
        this.reload();
      },
      error: err => this.error = err?.error?.message ?? 'Delete file failed'
    });
  }

  private clear(): void {
    this.error = null;
    this.info = null;
  }
}
