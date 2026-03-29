import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { CollaborativeSpace, SpaceType, ResourceStatus } from '../../../models/resource.models';

@Component({
  selector: 'app-collaborative-space',
  standalone: false,
  templateUrl: './collaborative-space.component.html',
  styleUrl: './collaborative-space.component.scss',
})
export class CollaborativeSpaceComponent implements OnInit {

  currentUser: User | null = null;
  spaces: CollaborativeSpace[] = [];
  isLoading = true;
  showForm = false;
  isEditing = false;
  selectedId: number | null = null;

  searchQuery = '';
  filterStatus = 'ALL';
  filterType = 'ALL';
  sortField: keyof CollaborativeSpace = 'name';
  sortAsc = true;

  page = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25];

  deleteDialogOpen = false;
  pendingDeleteId: number | null = null;

  fieldErrors: Partial<Record<'name' | 'building' | 'roomNumber' | 'capacity', string>> = {};

  spaceTypes = Object.values(SpaceType);
  statusOptions = Object.values(ResourceStatus);

  form = {
    name: '',
    capacity: 0,
    building: '',
    roomNumber: '',
    spaceType: SpaceType.MEETING_ROOM,
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
    this.loadSpaces();
  }

  get isStaff(): boolean {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  get displayedSpaces(): CollaborativeSpace[] {
    let result = [...this.spaces];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.building.toLowerCase().includes(q) ||
        s.roomNumber.toLowerCase().includes(q)
      );
    }

    if (this.filterStatus !== 'ALL') {
      result = result.filter(s => s.status === this.filterStatus);
    }

    if (this.filterType !== 'ALL') {
      result = result.filter(s => s.spaceType === this.filterType);
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

  get paginatedSpaces(): CollaborativeSpace[] {
    const start = (this.effectivePage - 1) * this.pageSize;
    return this.displayedSpaces.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.displayedSpaces.length / this.pageSize));
  }

  get rangeStart(): number {
    const n = this.displayedSpaces.length;
    if (n === 0) return 0;
    return (this.effectivePage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    const n = this.displayedSpaces.length;
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

  setSort(field: keyof CollaborativeSpace) {
    if (this.sortField === field) this.sortAsc = !this.sortAsc;
    else {
      this.sortField = field;
      this.sortAsc = true;
    }
  }

  sortIcon(field: keyof CollaborativeSpace): string {
    if (this.sortField !== field) return '↕';
    return this.sortAsc ? '↑' : '↓';
  }

  resetFilters() {
    this.searchQuery = '';
    this.filterStatus = 'ALL';
    this.filterType = 'ALL';
    this.sortField = 'name';
    this.sortAsc = true;
    this.page = 1;
  }

  loadSpaces(): void {
    this.http.get<CollaborativeSpace[]>(`${environment.apiUrl}/api/collaborative-spaces`).subscribe({
      next: (data) => {
        this.spaces = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load spaces', err);
        this.isLoading = false;
        this.toastService.error('Failed to load collaborative spaces.');
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
      spaceType: SpaceType.MEETING_ROOM,
      status: ResourceStatus.AVAILABLE
    };
    this.showForm = true;
    this.fieldErrors = {};
  }

  openEdit(space: CollaborativeSpace): void {
    this.isEditing = true;
    this.selectedId = space.id;
    this.form = {
      name: space.name,
      capacity: space.capacity,
      building: space.building,
      roomNumber: space.roomNumber,
      spaceType: space.spaceType,
      status: space.status
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
      this.fieldErrors.roomNumber = 'Room is required.';
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
      this.http.put<CollaborativeSpace>(
        `${environment.apiUrl}/api/collaborative-spaces/${this.selectedId}`,
        this.form
      ).subscribe({
        next: (updated) => {
          this.spaces = this.spaces.map(s =>
            s.id === this.selectedId ? updated : s
          );
          this.showForm = false;
          this.toastService.success('Collaborative space updated.');
        },
        error: (err) => {
          console.error('Failed to update space', err);
          this.toastService.error('Failed to update collaborative space.');
        }
      });
    } else {
      this.http.post<CollaborativeSpace>(
        `${environment.apiUrl}/api/collaborative-spaces`,
        this.form
      ).subscribe({
        next: (created) => {
          this.spaces.push(created);
          this.showForm = false;
          this.toastService.success('Collaborative space created.');
        },
        error: (err) => {
          console.error('Failed to create space', err);
          this.toastService.error('Failed to create collaborative space.');
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
    this.http.delete(`${environment.apiUrl}/api/collaborative-spaces/${id}`).subscribe({
      next: () => {
        this.spaces = this.spaces.filter(s => s.id !== id);
      },
      error: (err) => {
        console.error('Failed to delete space', err);
        this.toastService.error('Failed to delete collaborative space.');
      }
    });
  }

  cancel(): void {
    this.showForm = false;
  }

  exportFilteredCsv(): void {
    const rows = this.displayedSpaces.map(s => ({
      ID: s.id,
      Name: s.name,
      Building: s.building,
      Room: s.roomNumber,
      Capacity: s.capacity,
      Type: s.spaceType,
      Status: s.status,
      Created: s.createdAt,
      Updated: s.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadCsv('collaborative-spaces-export', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to CSV.`);
  }

  exportFilteredXlsx(): void {
    const rows = this.displayedSpaces.map(s => ({
      ID: s.id,
      Name: s.name,
      Building: s.building,
      Room: s.roomNumber,
      Capacity: s.capacity,
      Type: s.spaceType,
      Status: s.status,
      Created: s.createdAt,
      Updated: s.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadXlsx('collaborative-spaces-export', 'Collaborative spaces', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to Excel.`);
  }
}
