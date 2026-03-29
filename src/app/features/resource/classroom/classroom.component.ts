import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { Classroom, ClassroomType, ResourceStatus } from '../../../models/resource.models';

@Component({
  selector: 'app-classroom',
  templateUrl: './classroom.component.html',
  styleUrl: './classroom.component.scss'
})
export class ClassroomComponent implements OnInit {

  currentUser: User | null = null;
  classrooms: Classroom[] = [];
  isLoading = true;

  showForm = false;
  isEditing = false;
  selectedId: number | null = null;

  searchQuery = '';
  filterStatus = 'ALL';
  filterType = 'ALL';
  sortField: keyof Classroom = 'name';
  sortAsc = true;

  page = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25];

  deleteDialogOpen = false;
  pendingDeleteId: number | null = null;

  fieldErrors: Partial<Record<'name' | 'building' | 'roomNumber' | 'capacity', string>> = {};

  classroomTypes = Object.values(ClassroomType);
  statusOptions = Object.values(ResourceStatus);

  form = {
    name: '',
    capacity: 0,
    building: '',
    roomNumber: '',
    classroomType: ClassroomType.LECTURE_HALL,
    status: ResourceStatus.AVAILABLE
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private exportService: ResourceExportService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.load();
  }

  get isStaff() {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  get displayedItems(): Classroom[] {
    let res = [...this.classrooms];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      res = res.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.building.toLowerCase().includes(q) ||
        c.roomNumber.toLowerCase().includes(q)
      );
    }

    if (this.filterStatus !== 'ALL') res = res.filter(c => c.status === this.filterStatus);
    if (this.filterType !== 'ALL') res = res.filter(c => c.classroomType === this.filterType);

    res.sort((a, b) => {
      const A = a[this.sortField];
      const B = b[this.sortField];
      if (typeof A === 'number' && typeof B === 'number') return this.sortAsc ? A - B : B - A;
      return this.sortAsc ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
    });

    return res;
  }

  get effectivePage(): number {
    return Math.min(Math.max(1, this.page), this.totalPages);
  }

  get paginatedItems() {
    const start = (this.effectivePage - 1) * this.pageSize;
    return this.displayedItems.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.displayedItems.length / this.pageSize));
  }

  get rangeStart(): number {
    const n = this.displayedItems.length;
    if (n === 0) return 0;
    return (this.effectivePage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    const n = this.displayedItems.length;
    if (n === 0) return 0;
    return Math.min(this.effectivePage * this.pageSize, n);
  }

  nextPage() {
    const ep = this.effectivePage;
    if (ep < this.totalPages) this.page = ep + 1;
  }

  prevPage() {
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

  setSort(field: keyof Classroom) {
    this.sortField === field ? this.sortAsc = !this.sortAsc : (this.sortField = field, this.sortAsc = true);
  }

  sortIcon(field: keyof Classroom) {
    return this.sortField !== field ? '↕' : this.sortAsc ? '↑' : '↓';
  }

  resetFilters() {
    this.searchQuery = '';
    this.filterStatus = 'ALL';
    this.filterType = 'ALL';
    this.page = 1;
  }

  load() {
    this.http.get<Classroom[]>(`${environment.apiUrl}/api/classrooms`)
      .subscribe({
        next: data => {
          this.classrooms = data;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.toastService.error('Failed to load classrooms.');
        }
      });
  }

  openCreate() {
    this.isEditing = false;
    this.showForm = true;
    this.fieldErrors = {};
  }

  openEdit(c: Classroom) {
    this.isEditing = true;
    this.selectedId = c.id;
    this.form = { ...c };
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

  submit() {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the highlighted fields.');
      return;
    }

    const req = this.isEditing
      ? this.http.put(`${environment.apiUrl}/api/classrooms/${this.selectedId}`, this.form)
      : this.http.post(`${environment.apiUrl}/api/classrooms`, this.form);

    req.subscribe({
      next: () => {
        this.load();
        this.showForm = false;
        this.toastService.success(this.isEditing ? 'Classroom updated.' : 'Classroom created.');
      },
      error: () => {
        this.toastService.error(this.isEditing ? 'Failed to update classroom.' : 'Failed to create classroom.');
      }
    });
  }

  requestDelete(id: number) {
    this.pendingDeleteId = id;
    this.deleteDialogOpen = true;
  }

  onDeleteDialogClosed(open: boolean) {
    this.deleteDialogOpen = open;
    if (!open) this.pendingDeleteId = null;
  }

  confirmDelete() {
    const id = this.pendingDeleteId;
    if (id == null) return;
    this.pendingDeleteId = null;
    this.http.delete(`${environment.apiUrl}/api/classrooms/${id}`)
      .subscribe({
        next: () => this.load(),
        error: () => this.toastService.error('Failed to delete classroom.')
      });
  }

  cancel() {
    this.showForm = false;
  }

  exportFilteredCsv(): void {
    const rows = this.displayedItems.map(c => ({
      ID: c.id,
      Name: c.name,
      Building: c.building,
      Room: c.roomNumber,
      Capacity: c.capacity,
      Type: c.classroomType,
      Status: c.status,
      Created: c.createdAt,
      Updated: c.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadCsv('classrooms-export', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to CSV.`);
  }

  exportFilteredXlsx(): void {
    const rows = this.displayedItems.map(c => ({
      ID: c.id,
      Name: c.name,
      Building: c.building,
      Room: c.roomNumber,
      Capacity: c.capacity,
      Type: c.classroomType,
      Status: c.status,
      Created: c.createdAt,
      Updated: c.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadXlsx('classrooms-export', 'Classrooms', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to Excel.`);
  }
}
