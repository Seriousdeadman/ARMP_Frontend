import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { finalize } from 'rxjs/operators';
import { CandidateRecruitmentRow, CandidateStatus, Grade } from '../../../models/hr.models';
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
  imports: [CommonModule, FormsModule, DragDropModule, SlideOverPanelComponent],
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
}
