import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { Classroom, ClassroomType, ResourceStatus } from '../../../models/resource.models';
import { containsIgnoreCase, multiSort } from '../../../utils/resource-list.utils';

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
  private snapshotBeforeEdit: Classroom | null = null;

  advSearch = {
    nameContains: '',
    buildingContains: '',
    roomContains: '',
    capacityMin: '',
    capacityMax: '',
    status: 'ALL' as 'ALL' | ResourceStatus,
    type: 'ALL' as 'ALL' | ClassroomType
  };

  sortLevel1: { field: keyof Classroom | ''; asc: boolean } = { field: 'name', asc: true };
  sortLevel2: { field: keyof Classroom | ''; asc: boolean } = { field: '', asc: true };
  sortLevel3: { field: keyof Classroom | ''; asc: boolean } = { field: '', asc: true };

  readonly sortFieldOptions: { value: keyof Classroom | ''; label: string }[] = [
    { value: '', label: '— None —' },
    { value: 'name', label: 'Name' },
    { value: 'building', label: 'Building' },
    { value: 'roomNumber', label: 'Room' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'classroomType', label: 'Type' },
    { value: 'status', label: 'Status' }
  ];

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

    if (this.advSearch.nameContains.trim()) {
      res = res.filter(c => containsIgnoreCase(c.name, this.advSearch.nameContains));
    }
    if (this.advSearch.buildingContains.trim()) {
      res = res.filter(c => containsIgnoreCase(c.building, this.advSearch.buildingContains));
    }
    if (this.advSearch.roomContains.trim()) {
      res = res.filter(c => containsIgnoreCase(c.roomNumber, this.advSearch.roomContains));
    }

    const capMin = this.advSearch.capacityMin.trim();
    if (capMin !== '') {
      const n = Number(capMin);
      if (Number.isFinite(n)) res = res.filter(c => c.capacity >= n);
    }
    const capMax = this.advSearch.capacityMax.trim();
    if (capMax !== '') {
      const n = Number(capMax);
      if (Number.isFinite(n)) res = res.filter(c => c.capacity <= n);
    }

    if (this.advSearch.status !== 'ALL') {
      res = res.filter(c => c.status === this.advSearch.status);
    }
    if (this.advSearch.type !== 'ALL') {
      res = res.filter(c => c.classroomType === this.advSearch.type);
    }

    res = multiSort(res, [this.sortLevel1, this.sortLevel2, this.sortLevel3]);

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

  onSearchOrSortChange(): void {
    this.page = 1;
  }

  resetFilters() {
    this.advSearch = {
      nameContains: '',
      buildingContains: '',
      roomContains: '',
      capacityMin: '',
      capacityMax: '',
      status: 'ALL',
      type: 'ALL'
    };
    this.sortLevel1 = { field: 'name', asc: true };
    this.sortLevel2 = { field: '', asc: true };
    this.sortLevel3 = { field: '', asc: true };
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
    this.snapshotBeforeEdit = null;
    this.showForm = true;
    this.fieldErrors = {};
  }

  openEdit(c: Classroom) {
    this.isEditing = true;
    this.selectedId = c.id;
    this.snapshotBeforeEdit = { ...c };
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

  private classroomWriteBody() {
    return {
      name: this.form.name,
      capacity: this.form.capacity,
      building: this.form.building,
      roomNumber: this.form.roomNumber,
      classroomType: this.form.classroomType,
      status: this.form.status
    };
  }

  submit() {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the highlighted fields.');
      return;
    }

    const body = this.classroomWriteBody();
    const restoreId = this.selectedId;
    const previous = this.snapshotBeforeEdit;

    if (this.isEditing && restoreId != null) {
      this.http.put<Classroom>(
        `${environment.apiUrl}/api/classrooms/${restoreId}`,
        body
      ).subscribe({
        next: () => {
          this.load();
          this.showForm = false;
          this.snapshotBeforeEdit = null;
          if (previous) {
            const id = restoreId;
            const prevBody = {
              name: previous.name,
              capacity: previous.capacity,
              building: previous.building,
              roomNumber: previous.roomNumber,
              classroomType: previous.classroomType,
              status: previous.status
            };
            this.toastService.successWithAction(
              'Classroom updated.',
              'Undo',
              () => {
                this.http.put(`${environment.apiUrl}/api/classrooms/${id}`, prevBody)
                  .subscribe({
                    next: () => this.load(),
                    error: () => this.toastService.error('Undo failed.')
                  });
              }
            );
          } else {
            this.toastService.success('Classroom updated.');
          }
        },
        error: () => this.toastService.error('Failed to update classroom.')
      });
    } else {
      this.http.post<Classroom>(`${environment.apiUrl}/api/classrooms`, body)
        .subscribe({
          next: (created) => {
            this.load();
            this.showForm = false;
            const newId = created?.id;
            if (newId != null) {
              this.toastService.successWithAction(
                'Classroom created.',
                'Undo',
                () => {
                  this.http.delete(`${environment.apiUrl}/api/classrooms/${newId}`)
                    .subscribe({
                      next: () => this.load(),
                      error: () => this.toastService.error('Undo failed.')
                    });
                }
              );
            } else {
              this.toastService.success('Classroom created.');
            }
          },
          error: () => this.toastService.error('Failed to create classroom.')
        });
    }
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
    const entity = this.classrooms.find(c => c.id === id);
    this.pendingDeleteId = null;
    this.http.delete(`${environment.apiUrl}/api/classrooms/${id}`)
      .subscribe({
        next: () => {
          this.load();
          if (entity) {
            const payload = {
              name: entity.name,
              capacity: entity.capacity,
              building: entity.building,
              roomNumber: entity.roomNumber,
              classroomType: entity.classroomType,
              status: entity.status
            };
            this.toastService.successWithAction(
              'Classroom deleted.',
              'Undo',
              () => {
                this.http.post(`${environment.apiUrl}/api/classrooms`, payload)
                  .subscribe({
                    next: () => this.load(),
                    error: () => this.toastService.error('Undo failed.')
                  });
              }
            );
          } else {
            this.toastService.success('Classroom deleted.');
          }
        },
        error: () => this.toastService.error('Failed to delete classroom.')
      });
  }

  cancel() {
    this.showForm = false;
    this.snapshotBeforeEdit = null;
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
