import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Grade, GradeName, GradeRequest } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';

@Component({
  selector: 'app-hr-admin-grades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-grades.component.html',
  styleUrl: './hr-admin-pages.shared.scss'
})
export class HrAdminGradesComponent implements OnInit {
  private readonly hrService = inject(HrService);

  grades: Grade[] = [];
  searchQuery = '';
  selectedId = '';
  names: GradeName[] = ['ASSISTANT', 'MAITRE', 'PROF'];
  form: GradeRequest = { name: 'ASSISTANT', baseSalary: 0, hourlyBonus: 0 };
  error: string | null = null;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.hrService.listGrades().subscribe({ next: v => this.grades = v });
  }

  pick(id: string): void {
    this.selectedId = id;
    const g = this.grades.find(x => x.id === id);
    if (g) this.form = { name: g.name, baseSalary: g.baseSalary, hourlyBonus: g.hourlyBonus };
  }

  create(): void {
    if (!this.validateForm()) { return; }
    this.error = null;
    this.hrService.createGrade(this.form).subscribe({ next: () => this.reload(), error: e => this.error = e?.error?.message ?? 'Create failed' });
  }

  update(): void {
    if (!this.selectedId) { this.error = 'Select grade first'; return; }
    if (!this.validateForm()) { return; }
    this.error = null;
    this.hrService.updateGrade(this.selectedId, this.form).subscribe({ next: () => this.reload(), error: e => this.error = e?.error?.message ?? 'Update failed' });
  }

  remove(): void {
    if (!this.selectedId) { this.error = 'Select grade first'; return; }
    this.error = null;
    this.hrService.deleteGrade(this.selectedId).subscribe({ next: () => { this.selectedId = ''; this.reload(); }, error: e => this.error = e?.error?.message ?? 'Delete failed' });
  }

  get filteredGrades(): Grade[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return this.grades;
    }
    return this.grades.filter(grade =>
      grade.name.toLowerCase().includes(query)
      || grade.baseSalary.toString().includes(query)
      || grade.hourlyBonus.toString().includes(query)
    );
  }

  private validateForm(): boolean {
    if (this.form.baseSalary < 0) {
      this.error = 'Base salary cannot be negative.';
      return false;
    }
    if (this.form.hourlyBonus < 0) {
      this.error = 'Hourly bonus cannot be negative.';
      return false;
    }
    return true;
  }
}
