import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Department } from '../../../models/hr.models';
import { HrService } from '../../../services/hr.service';

@Component({
  selector: 'app-hr-admin-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-admin-departments.component.html',
  styleUrl: './hr-admin-pages.shared.scss'
})
export class HrAdminDepartmentsComponent implements OnInit {
  private readonly hrService = inject(HrService);

  departments: Department[] = [];
  searchQuery = '';
  selectedId = '';
  name = '';
  error: string | null = null;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.hrService.listDepartments().subscribe({ next: v => this.departments = v });
  }

  pick(id: string): void {
    this.selectedId = id;
    const d = this.departments.find(x => x.id === id);
    this.name = d?.name ?? '';
  }

  create(): void {
    if (!this.validateName()) { return; }
    this.error = null;
    this.hrService.createDepartment({ name: this.name }).subscribe({ next: () => this.reload(), error: e => this.error = e?.error?.message ?? 'Create failed' });
  }

  update(): void {
    if (!this.selectedId) { this.error = 'Select department first'; return; }
    if (!this.validateName()) { return; }
    this.error = null;
    this.hrService.updateDepartment(this.selectedId, { name: this.name }).subscribe({ next: () => this.reload(), error: e => this.error = e?.error?.message ?? 'Update failed' });
  }

  remove(): void {
    if (!this.selectedId) { this.error = 'Select department first'; return; }
    this.error = null;
    this.hrService.deleteDepartment(this.selectedId).subscribe({ next: () => { this.selectedId = ''; this.name = ''; this.reload(); }, error: e => this.error = e?.error?.message ?? 'Delete failed' });
  }

  get filteredDepartments(): Department[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return this.departments;
    }
    return this.departments.filter(department => department.name.toLowerCase().includes(query));
  }

  private validateName(): boolean {
    if (!this.name.trim()) {
      this.error = 'Department name is required.';
      return false;
    }
    return true;
  }
}
