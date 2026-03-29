import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { Laboratory, LabType, ResourceStatus } from '../../../models/resource.models';

@Component({
  selector: 'app-laboratory',
  standalone: false,
  templateUrl: './laboratory.component.html',
  styleUrl: './laboratory.component.scss'
})
export class LaboratoryComponent implements OnInit {

  currentUser: User | null = null;
  laboratories: Laboratory[] = [];
  isLoading = true;
  showForm = false;
  isEditing = false;
  selectedId: number | null = null;

  searchQuery = '';
  filterStatus = 'ALL';
  filterType = 'ALL';
  sortField: keyof Laboratory = 'name';
  sortAsc = true;

  page = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25];

  deleteDialogOpen = false;
  pendingDeleteId: number | null = null;

  fieldErrors: Partial<Record<'name' | 'building' | 'roomNumber' | 'capacity', string>> = {};

  labTypes = Object.values(LabType);
  statusOptions = Object.values(ResourceStatus);

  form = {
    name: '',
    capacity: 0,
    building: '',
    roomNumber: '',
    labType: LabType.COMPUTER_LAB,
    status: ResourceStatus.AVAILABLE
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private exportService: ResourceExportService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadLaboratories();
  }

  get isStaff(): boolean {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  get displayedLaboratories(): Laboratory[] {
    let result = [...this.laboratories];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.building.toLowerCase().includes(q) ||
        l.roomNumber.toLowerCase().includes(q)
      );
    }

    if (this.filterStatus !== 'ALL') {
      result = result.filter(l => l.status === this.filterStatus);
    }

    if (this.filterType !== 'ALL') {
      result = result.filter(l => l.labType === this.filterType);
    }

    result.sort((a, b) => {
      const valA = a[this.sortField];
      const valB = b[this.sortField];

      if (valA === undefined || valB === undefined) return 0;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortAsc ? valA - valB : valB - valA;
      }

      return this.sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return result;
  }

  get effectivePage(): number {
    return Math.min(Math.max(1, this.page), this.totalPages);
  }

  get paginatedLaboratories(): Laboratory[] {
    const start = (this.effectivePage - 1) * this.pageSize;
    return this.displayedLaboratories.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.displayedLaboratories.length / this.pageSize));
  }

  get rangeStart(): number {
    const n = this.displayedLaboratories.length;
    if (n === 0) return 0;
    return (this.effectivePage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    const n = this.displayedLaboratories.length;
    if (n === 0) return 0;
    return Math.min(this.effectivePage * this.pageSize, n);
  }

  nextPage(): void {
    const ep = this.effectivePage;
    if (ep < this.totalPages) this.page = ep + 1;
  }

  prevPage(): void {
    const ep = this.effectivePage;
    if (ep > 1) this.page = ep - 1;
  }

  onPageSizeChange(): void {
    const v = Number(this.pageSize);
    if (!Number.isFinite(v) || v < 1) {
      this.pageSize = 5;
    } else if (v > 100) {
      this.pageSize = 100;
    }
    this.page = 1;
  }

  setSort(field: keyof Laboratory): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
  }

  sortIcon(field: keyof Laboratory): string {
    if (this.sortField !== field) return '↕';
    return this.sortAsc ? '↑' : '↓';
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterStatus = 'ALL';
    this.filterType = 'ALL';
    this.sortField = 'name';
    this.sortAsc = true;
    this.page = 1;
  }

  loadLaboratories(): void {
    this.http.get<Laboratory[]>(`${environment.apiUrl}/api/laboratories`).subscribe({
      next: (data) => {
        this.laboratories = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load laboratories', err);
        this.isLoading = false;
        this.toastService.error('Failed to load laboratories.');
      }
    });
  }

  openCreate(): void {
    this.isEditing = false;
    this.selectedId = null;
    this.form = {
      name: '',
      capacity: 0,
      building: '',
      roomNumber: '',
      labType: LabType.COMPUTER_LAB,
      status: ResourceStatus.AVAILABLE
    };
    this.showForm = true;
    this.fieldErrors = {};
  }

  openEdit(lab: Laboratory): void {
    this.isEditing = true;
    this.selectedId = lab.id;
    this.form = {
      name: lab.name,
      capacity: lab.capacity,
      building: lab.building,
      roomNumber: lab.roomNumber,
      labType: lab.labType,
      status: lab.status
    };
    this.showForm = true;
    this.fieldErrors = {};
  }

  private validateForm(): boolean {
    this.fieldErrors = {};
    let ok = true;
    if (!this.form.name?.trim()) {
      this.fieldErrors.name = 'Name is required.';
      ok = false;
    }
    if (!this.form.building?.trim()) {
      this.fieldErrors.building = 'Building is required.';
      ok = false;
    }
    if (!this.form.roomNumber?.trim()) {
      this.fieldErrors.roomNumber = 'Room number is required.';
      ok = false;
    }
    const cap = Number(this.form.capacity);
    if (!Number.isFinite(cap) || cap < 1) {
      this.fieldErrors.capacity = 'Capacity must be at least 1.';
      ok = false;
    }
    return ok;
  }

  submit(): void {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the highlighted fields.');
      return;
    }

    if (this.isEditing && this.selectedId !== null) {
      this.http.put<Laboratory>(
        `${environment.apiUrl}/api/laboratories/${this.selectedId}`,
        this.form
      ).subscribe({
        next: (updated) => {
          this.laboratories = this.laboratories.map(l =>
            l.id === this.selectedId ? updated : l
          );
          this.showForm = false;
          this.toastService.success('Laboratory updated.');
        },
        error: (err) => {
          console.error('Failed to update laboratory', err);
          this.toastService.error('Failed to update laboratory.');
        }
      });
    } else {
      this.http.post<Laboratory>(
        `${environment.apiUrl}/api/laboratories`,
        this.form
      ).subscribe({
        next: (created) => {
          this.laboratories.push(created);
          this.showForm = false;
          this.toastService.success('Laboratory created.');
        },
        error: (err) => {
          console.error('Failed to create laboratory', err);
          this.toastService.error('Failed to create laboratory.');
        }
      });
    }
  }

  requestDelete(id: number): void {
    this.pendingDeleteId = id;
    this.deleteDialogOpen = true;
  }

  onDeleteDialogClosed(open: boolean): void {
    this.deleteDialogOpen = open;
    if (!open) this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId;
    if (id == null) return;
    this.pendingDeleteId = null;
    this.http.delete(`${environment.apiUrl}/api/laboratories/${id}`).subscribe({
      next: () => {
        this.laboratories = this.laboratories.filter(l => l.id !== id);
      },
      error: (err) => {
        console.error('Failed to delete laboratory', err);
        this.toastService.error('Failed to delete laboratory.');
      }
    });
  }

  cancel(): void {
    this.showForm = false;
  }

  exportFilteredCsv(): void {
    const rows = this.displayedLaboratories.map(l => ({
      ID: l.id,
      Name: l.name,
      Building: l.building,
      Room: l.roomNumber,
      Capacity: l.capacity,
      Type: l.labType,
      Status: l.status,
      Created: l.createdAt,
      Updated: l.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadCsv('laboratories-export', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to CSV.`);
  }

  exportFilteredXlsx(): void {
    const rows = this.displayedLaboratories.map(l => ({
      ID: l.id,
      Name: l.name,
      Building: l.building,
      Room: l.roomNumber,
      Capacity: l.capacity,
      Type: l.labType,
      Status: l.status,
      Created: l.createdAt,
      Updated: l.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadXlsx('laboratories-export', 'Laboratories', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to Excel.`);
  }
}
