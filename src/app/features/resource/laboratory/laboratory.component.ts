import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { Laboratory, LabType, ResourceStatus } from '../../../models/resource.models';
import { containsIgnoreCase, multiSort } from '../../../utils/resource-list.utils';

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
  private snapshotBeforeEdit: Laboratory | null = null;

  advSearch = {
    nameContains: '',
    buildingContains: '',
    roomContains: '',
    capacityMin: '',
    capacityMax: '',
    status: 'ALL' as 'ALL' | ResourceStatus,
    type: 'ALL' as 'ALL' | LabType
  };

  sortLevel1: { field: keyof Laboratory | ''; asc: boolean } = { field: 'name', asc: true };
  sortLevel2: { field: keyof Laboratory | ''; asc: boolean } = { field: '', asc: true };
  sortLevel3: { field: keyof Laboratory | ''; asc: boolean } = { field: '', asc: true };

  readonly sortFieldOptions: { value: keyof Laboratory | ''; label: string }[] = [
    { value: '', label: '— None —' },
    { value: 'name', label: 'Name' },
    { value: 'building', label: 'Building' },
    { value: 'roomNumber', label: 'Room' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'labType', label: 'Type' },
    { value: 'status', label: 'Status' }
  ];

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

    if (this.advSearch.nameContains.trim()) {
      result = result.filter(l => containsIgnoreCase(l.name, this.advSearch.nameContains));
    }
    if (this.advSearch.buildingContains.trim()) {
      result = result.filter(l => containsIgnoreCase(l.building, this.advSearch.buildingContains));
    }
    if (this.advSearch.roomContains.trim()) {
      result = result.filter(l => containsIgnoreCase(l.roomNumber, this.advSearch.roomContains));
    }

    const capMin = this.advSearch.capacityMin.trim();
    if (capMin !== '') {
      const n = Number(capMin);
      if (Number.isFinite(n)) result = result.filter(l => l.capacity >= n);
    }
    const capMax = this.advSearch.capacityMax.trim();
    if (capMax !== '') {
      const n = Number(capMax);
      if (Number.isFinite(n)) result = result.filter(l => l.capacity <= n);
    }

    if (this.advSearch.status !== 'ALL') {
      result = result.filter(l => l.status === this.advSearch.status);
    }
    if (this.advSearch.type !== 'ALL') {
      result = result.filter(l => l.labType === this.advSearch.type);
    }

    result = multiSort(result, [this.sortLevel1, this.sortLevel2, this.sortLevel3]);

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

  onSearchOrSortChange(): void {
    this.page = 1;
  }

  resetFilters(): void {
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
    this.snapshotBeforeEdit = null;
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
    this.snapshotBeforeEdit = { ...lab };
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

  private labWriteBody() {
    return {
      name: this.form.name,
      capacity: this.form.capacity,
      building: this.form.building,
      roomNumber: this.form.roomNumber,
      labType: this.form.labType,
      status: this.form.status
    };
  }

  submit(): void {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the highlighted fields.');
      return;
    }

    const body = this.labWriteBody();
    const restoreId = this.selectedId;
    const previous = this.snapshotBeforeEdit;

    if (this.isEditing && restoreId !== null) {
      this.http.put<Laboratory>(
        `${environment.apiUrl}/api/laboratories/${restoreId}`,
        body
      ).subscribe({
        next: () => {
          this.loadLaboratories();
          this.showForm = false;
          this.snapshotBeforeEdit = null;
          if (previous) {
            const id = restoreId;
            const prevBody = {
              name: previous.name,
              capacity: previous.capacity,
              building: previous.building,
              roomNumber: previous.roomNumber,
              labType: previous.labType,
              status: previous.status
            };
            this.toastService.successWithAction(
              'Laboratory updated.',
              'Undo',
              () => {
                this.http.put(`${environment.apiUrl}/api/laboratories/${id}`, prevBody)
                  .subscribe({
                    next: () => this.loadLaboratories(),
                    error: () => this.toastService.error('Undo failed.')
                  });
              }
            );
          } else {
            this.toastService.success('Laboratory updated.');
          }
        },
        error: (err) => {
          console.error('Failed to update laboratory', err);
          this.toastService.error('Failed to update laboratory.');
        }
      });
    } else {
      this.http.post<Laboratory>(`${environment.apiUrl}/api/laboratories`, body)
        .subscribe({
          next: (created) => {
            this.loadLaboratories();
            this.showForm = false;
            const newId = created?.id;
            if (newId != null) {
              this.toastService.successWithAction(
                'Laboratory created.',
                'Undo',
                () => {
                  this.http.delete(`${environment.apiUrl}/api/laboratories/${newId}`)
                    .subscribe({
                      next: () => this.loadLaboratories(),
                      error: () => this.toastService.error('Undo failed.')
                    });
                }
              );
            } else {
              this.toastService.success('Laboratory created.');
            }
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
    const entity = this.laboratories.find(l => l.id === id);
    this.pendingDeleteId = null;
    this.http.delete(`${environment.apiUrl}/api/laboratories/${id}`).subscribe({
      next: () => {
        this.loadLaboratories();
        if (entity) {
          const payload = {
            name: entity.name,
            capacity: entity.capacity,
            building: entity.building,
            roomNumber: entity.roomNumber,
            labType: entity.labType,
            status: entity.status
          };
          this.toastService.successWithAction(
            'Laboratory deleted.',
            'Undo',
            () => {
              this.http.post(`${environment.apiUrl}/api/laboratories`, payload)
                .subscribe({
                  next: () => this.loadLaboratories(),
                  error: () => this.toastService.error('Undo failed.')
                });
            }
          );
        } else {
          this.toastService.success('Laboratory deleted.');
        }
      },
      error: (err) => {
        console.error('Failed to delete laboratory', err);
        this.toastService.error('Failed to delete laboratory.');
      }
    });
  }

  cancel(): void {
    this.showForm = false;
    this.snapshotBeforeEdit = null;
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
