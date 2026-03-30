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
  Department,
  Grade,
  Interview,
  RecruitmentAssignment
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
  departments: Department[] = [];
  selectedGradeId = '';
  selectedDepartmentId = '';
  hireSubmitting = false;
  hireError: string | null = null;

  reviewPanelOpen = false;
  reviewLoading = false;
  reviewError: string | null = null;
  reviewDetail: Candidate | null = null;
  reviewRow: CandidateRecruitmentRow | null = null;
  reviewInterviews: Interview[] = [];
  reviewFileMeta: CvFileMetadata | null = null;

  assignments: RecruitmentAssignment[] = [];
  assignmentsLoading = false;

  /** Accepted candidates pinned to the bottom panel for interview timeline review. */
  trackedAcceptedIds: string[] = [];
  interviewsByCandidateId = new Map<string, Interview[]>();
  interviewLoadErrorById = new Map<string, string>();
  private interviewLoadingIds = new Set<string>();

  isInterviewLoading(candidateId: string): boolean {
    return this.interviewLoadingIds.has(candidateId);
  }

  expandedTrackedId: string | null = null;
  expandedAssignmentEmployeeId: string | null = null;

  ngOnInit(): void {
    this.reload();
    forkJoin({
      grades: this.hr.listGrades().pipe(catchError(() => of<Grade[]>([]))),
      departments: this.hr.listDepartments().pipe(catchError(() => of<Department[]>([])))
    }).subscribe({
      next: ({ grades, departments }) => {
        this.grades = grades;
        this.departments = departments;
        if (grades.length > 0 && !this.selectedGradeId) {
          this.selectedGradeId = grades[0].id;
        }
      },
      error: () => {
        this.grades = [];
        this.departments = [];
      }
    });
  }

  reload(): void {
    this.isLoading = true;
    this.assignmentsLoading = true;
    this.error = null;
    forkJoin({
      rows: this.hr.listRecruitmentCandidates(),
      assigned: this.hr.listRecruitmentAssignments().pipe(
        catchError(() => of<RecruitmentAssignment[]>([]))
      )
    })
      .pipe(finalize(() => {
        this.isLoading = false;
        this.assignmentsLoading = false;
      }))
      .subscribe({
        next: ({ rows, assigned }) => {
          this.assignments = assigned;
          this.distribute(rows);
          this.pruneTrackedAccepted(rows);
        },
        error: err => {
          this.error = err?.error?.message ?? 'Failed to load talent board';
        }
      });
  }

  private pruneTrackedAccepted(rows: CandidateRecruitmentRow[]): void {
    const ids = new Set(rows.map(r => r.id));
    this.trackedAcceptedIds = this.trackedAcceptedIds.filter(id => ids.has(id));
    const nextMap = new Map(this.interviewsByCandidateId);
    const nextErr = new Map(this.interviewLoadErrorById);
    for (const id of [...nextMap.keys()]) {
      if (!ids.has(id)) {
        nextMap.delete(id);
        nextErr.delete(id);
      }
    }
    this.interviewsByCandidateId = nextMap;
    this.interviewLoadErrorById = nextErr;
  }

  getTrackedAcceptedRows(): CandidateRecruitmentRow[] {
    const accepted = this.columns.find(c => c.id === 'ACCEPTED')?.cards ?? [];
    return this.trackedAcceptedIds
      .map(id => accepted.find(r => r.id === id))
      .filter((r): r is CandidateRecruitmentRow => r != null);
  }

  isTrackedAccepted(id: string): boolean {
    return this.trackedAcceptedIds.includes(id);
  }

  toggleTrackAccepted(row: CandidateRecruitmentRow): void {
    if (row.status !== 'ACCEPTED') {
      return;
    }
    const i = this.trackedAcceptedIds.indexOf(row.id);
    if (i >= 0) {
      this.trackedAcceptedIds = this.trackedAcceptedIds.filter(id => id !== row.id);
      const nm = new Map(this.interviewsByCandidateId);
      nm.delete(row.id);
      this.interviewsByCandidateId = nm;
      const ne = new Map(this.interviewLoadErrorById);
      ne.delete(row.id);
      this.interviewLoadErrorById = ne;
      if (this.expandedTrackedId === row.id) {
        this.expandedTrackedId = null;
      }
      return;
    }
    this.trackedAcceptedIds = [...this.trackedAcceptedIds, row.id];
    this.fetchInterviewsFor(row.id);
    this.expandedTrackedId = row.id;
  }

  toggleExpandTracked(id: string): void {
    this.expandedTrackedId = this.expandedTrackedId === id ? null : id;
  }

  toggleExpandAssignment(employeeId: string): void {
    this.expandedAssignmentEmployeeId =
      this.expandedAssignmentEmployeeId === employeeId ? null : employeeId;
  }

  private fetchInterviewsFor(candidateId: string): void {
    if (this.interviewLoadingIds.has(candidateId)) {
      return;
    }
    this.interviewLoadingIds.add(candidateId);
    const clearedErr = new Map(this.interviewLoadErrorById);
    clearedErr.delete(candidateId);
    this.interviewLoadErrorById = clearedErr;
    this.hr.listInterviews(candidateId).subscribe({
      next: list => {
        const nextMap = new Map(this.interviewsByCandidateId);
        nextMap.set(candidateId, list);
        this.interviewsByCandidateId = nextMap;
        this.interviewLoadingIds.delete(candidateId);
      },
      error: err => {
        const ne = new Map(this.interviewLoadErrorById);
        ne.set(candidateId, err?.error?.message ?? 'Could not load interviews');
        this.interviewLoadErrorById = ne;
        this.interviewLoadingIds.delete(candidateId);
      }
    });
  }

  formatWhen(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString();
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

  trackAssignment(_i: number, row: RecruitmentAssignment): string {
    return row.employeeId;
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
          this.applyHireDefaults(row.departmentId);
          this.hirePanelOpen = true;
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
    this.hr.promoteCandidate(this.hireCandidate.id, {
      gradeId: this.selectedGradeId,
      departmentId: this.selectedDepartmentId || null
    })
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
    this.reviewRow = row;
    this.reviewInterviews = [];
    this.reviewPanelOpen = true;
    this.reviewLoading = true;
    this.reviewError = null;
    this.reviewDetail = null;
    this.reviewFileMeta = null;
    const interviews$ =
      row.status === 'ACCEPTED' || row.status === 'INTERVIEWING'
        ? this.hr.listInterviews(row.id).pipe(catchError(() => of<Interview[]>([])))
        : of<Interview[]>([]);
    forkJoin({
      candidate: this.hr.getCandidate(row.id),
      meta: this.hr.getCandidateCvFileMetadata(row.id).pipe(catchError(() => of(null))),
      interviews: interviews$
    })
      .pipe(finalize(() => { this.reviewLoading = false; }))
      .subscribe({
        next: ({ candidate, meta, interviews }) => {
          this.reviewDetail = candidate;
          this.reviewFileMeta = meta;
          const list = interviews ?? [];
          this.reviewInterviews = list.slice().sort(
            (a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime()
          );
        },
        error: err => {
          this.reviewError = err?.error?.message ?? 'Could not load candidate';
        }
      });
  }

  closeReview(): void {
    this.reviewPanelOpen = false;
    this.reviewDetail = null;
    this.reviewRow = null;
    this.reviewInterviews = [];
    this.reviewFileMeta = null;
    this.reviewError = null;
  }

  openHireFromReview(): void {
    if (!this.reviewRow || this.reviewRow.status !== 'ACCEPTED' || !this.reviewDetail) {
      return;
    }
    this.hireCandidate = this.reviewRow;
    this.hireError = null;
    const hint = this.reviewDetail.department?.id ?? this.reviewRow.departmentId;
    this.applyHireDefaults(hint);
    this.closeReview();
    this.hirePanelOpen = true;
  }

  private applyHireDefaults(departmentIdHint: string | null | undefined): void {
    const id = departmentIdHint?.trim();
    if (id && this.departments.some(d => d.id === id)) {
      this.selectedDepartmentId = id;
    } else {
      this.selectedDepartmentId = '';
    }
    if (this.grades.length > 0 && !this.selectedGradeId) {
      this.selectedGradeId = this.grades[0].id;
    }
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
