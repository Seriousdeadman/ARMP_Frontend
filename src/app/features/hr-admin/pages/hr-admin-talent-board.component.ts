import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  Candidate,
  CandidateRecruitmentRow,
  CandidateStatus,
  CvFileMetadata,
  Grade
} from '../../../models/hr.models';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../services/hr.service';
import { SlideOverPanelComponent } from '../../../shared/slide-over-panel/slide-over-panel.component';

type ColumnId = CandidateStatus;

interface KanbanColumn {
  id: ColumnId;
  label: string;
  cards: CandidateRecruitmentRow[];
}

@Component({
  selector: 'app-hr-admin-talent-board',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, RouterLink, SlideOverPanelComponent],
  templateUrl: './hr-admin-talent-board.component.html',
  styleUrl: './hr-admin-talent-board.component.scss'
})
export class HrAdminTalentBoardComponent implements OnInit {
  private readonly hr = inject(HrService);

  columns: KanbanColumn[] = [
    { id: 'NEW', label: 'New', cards: [] },
    { id: 'INTERVIEWING', label: 'Interviewing', cards: [] },
    { id: 'ACCEPTED', label: 'Accepted', cards: [] },
    { id: 'REJECTED', label: 'Rejected', cards: [] }
  ];

  isLoading = false;
  error: string | null = null;
  hirePanelOpen = false;
  hireCandidate: CandidateRecruitmentRow | null = null;
  grades: Grade[] = [];
  selectedGradeId = '';
  hireSubmitting = false;
  hireError: string | null = null;

  reviewPanelOpen = false;
  reviewLoading = false;
  reviewError: string | null = null;
  reviewDetail: Candidate | null = null;
  reviewFileMeta: CvFileMetadata | null = null;

  ngOnInit(): void {
    this.reload();
    this.hr.listGrades().subscribe({
      next: g => {
        this.grades = g;
        if (g.length > 0 && !this.selectedGradeId) {
          this.selectedGradeId = g[0].id;
        }
      },
      error: () => {
        this.grades = [];
      }
    });
  }

  reload(): void {
    this.isLoading = true;
    this.error = null;
    this.hr.listRecruitmentCandidates()
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: rows => this.distribute(rows),
        error: err => {
          this.error = err?.error?.message ?? 'Failed to load talent board';
        }
      });
  }

  private distribute(rows: CandidateRecruitmentRow[]): void {
    const byStatus = new Map<CandidateStatus, CandidateRecruitmentRow[]>();
    for (const c of this.columns) {
      byStatus.set(c.id, []);
    }
    for (const r of rows) {
      const list = byStatus.get(r.status);
      if (list) {
        list.push(r);
      } else {
        byStatus.get('NEW')?.push(r);
      }
    }
    for (const c of this.columns) {
      c.cards = byStatus.get(c.id) ?? [];
    }
  }

  trackCol(_i: number, col: KanbanColumn): string {
    return col.id;
  }

  trackCard(_i: number, row: CandidateRecruitmentRow): string {
    return row.id;
  }

  onDrop(event: CdkDragDrop<CandidateRecruitmentRow[]>, targetStatus: CandidateStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const row = event.previousContainer.data[event.previousIndex];
    if (row.status === targetStatus) {
      return;
    }
    if (
      row.status === 'ACCEPTED'
      && (targetStatus === 'NEW' || targetStatus === 'INTERVIEWING')
    ) {
      this.error = 'Cannot move an accepted candidate back to New or Interviewing.';
      return;
    }
    this.error = null;
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    row.status = targetStatus;

    this.hr.patchCandidateStatus(row.id, targetStatus).subscribe({
      next: () => {
        if (targetStatus === 'ACCEPTED') {
          this.hireCandidate = row;
          this.hireError = null;
          this.hirePanelOpen = true;
          if (this.grades.length > 0 && !this.selectedGradeId) {
            this.selectedGradeId = this.grades[0].id;
          }
        }
      },
      error: err => {
        this.error = err?.error?.message ?? 'Could not update status';
        this.reload();
      }
    });
  }

  closeHirePanel(): void {
    this.hirePanelOpen = false;
    this.hireCandidate = null;
  }

  confirmHire(): void {
    if (!this.hireCandidate || !this.selectedGradeId) {
      return;
    }
    this.hireSubmitting = true;
    this.hireError = null;
    this.hr.promoteCandidate(this.hireCandidate.id, this.selectedGradeId)
      .pipe(finalize(() => { this.hireSubmitting = false; }))
      .subscribe({
        next: () => {
          this.closeHirePanel();
          this.reload();
        },
        error: err => {
          this.hireError = err?.error?.message ?? 'Hire failed';
        }
      });
  }

  skipHire(): void {
    this.closeHirePanel();
  }

  openReview(row: CandidateRecruitmentRow): void {
    this.reviewPanelOpen = true;
    this.reviewLoading = true;
    this.reviewError = null;
    this.reviewDetail = null;
    this.reviewFileMeta = null;
    forkJoin({
      candidate: this.hr.getCandidate(row.id),
      meta: this.hr.getCandidateCvFileMetadata(row.id).pipe(catchError(() => of(null)))
    })
      .pipe(finalize(() => { this.reviewLoading = false; }))
      .subscribe({
        next: ({ candidate, meta }) => {
          this.reviewDetail = candidate;
          this.reviewFileMeta = meta;
        },
        error: err => {
          this.reviewError = err?.error?.message ?? 'Could not load candidate';
        }
      });
  }

  closeReview(): void {
    this.reviewPanelOpen = false;
    this.reviewDetail = null;
    this.reviewFileMeta = null;
    this.reviewError = null;
  }

  downloadReviewCv(): void {
    const id = this.reviewDetail?.id;
    if (!id) {
      return;
    }
    this.reviewError = null;
    this.hr.downloadCandidateCvFile(id).subscribe({
      next: blob => {
        const name = this.reviewFileMeta?.fileName?.trim() || 'cv';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.reviewError = 'Could not download file';
      }
    });
  }
}
