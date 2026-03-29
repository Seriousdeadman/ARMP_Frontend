import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { CollaborativeSpace, SpaceType, ResourceStatus } from '../../../models/resource.models';
import { containsIgnoreCase, multiSort } from '../../../utils/resource-list.utils';

@Component({
  selector: 'app-collaborative-space',
  standalone: false,
  templateUrl: './collaborative-space.component.html',
  styleUrl: './collaborative-space.component.scss'
})
export class CollaborativeSpaceComponent implements OnInit {

  currentUser: User | null = null;
  spaces: CollaborativeSpace[] = [];
  isLoading = true;
  showForm = false;
  isEditing = false;
  selectedId: number | null = null;
  private snapshotBeforeEdit: CollaborativeSpace | null = null;

  advSearch = {
    nameContains: '',
    buildingContains: '',
    roomContains: '',
    capacityMin: '',
    capacityMax: '',
    status: 'ALL' as 'ALL' | ResourceStatus,
    type: 'ALL' as 'ALL' | SpaceType
  };

  sortLevel1: { field: keyof CollaborativeSpace | ''; asc: boolean } = { field: 'name', asc: true };
  sortLevel2: { field: keyof CollaborativeSpace | ''; asc: boolean } = { field: '', asc: true };
  sortLevel3: { field: keyof CollaborativeSpace | ''; asc: boolean } = { field: '', asc: true };

  readonly sortFieldOptions: { value: keyof CollaborativeSpace | ''; label: string }[] = [
    { value: '', label: '— None —' },
    { value: 'name', label: 'Name' },
    { value: 'building', label: 'Building' },
    { value: 'roomNumber', label: 'Room' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'spaceType', label: 'Type' },
    { value: 'status', label: 'Status' }
  ];

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

    if (this.advSearch.nameContains.trim()) {
      result = result.filter(s => containsIgnoreCase(s.name, this.advSearch.nameContains));
    }
    if (this.advSearch.buildingContains.trim()) {
      result = result.filter(s => containsIgnoreCase(s.building, this.advSearch.buildingContains));
    }
    if (this.advSearch.roomContains.trim()) {
      result = result.filter(s => containsIgnoreCase(s.roomNumber, this.advSearch.roomContains));
    }

    const capMin = this.advSearch.capacityMin.trim();
    if (capMin !== '') {
      const n = Number(capMin);
      if (Number.isFinite(n)) result = result.filter(s => s.capacity >= n);
    }
    const capMax = this.advSearch.capacityMax.trim();
    if (capMax !== '') {
      const n = Number(capMax);
      if (Number.isFinite(n)) result = result.filter(s => s.capacity <= n);
    }

    if (this.advSearch.status !== 'ALL') {
      result = result.filter(s => s.status === this.advSearch.status);
    }
    if (this.advSearch.type !== 'ALL') {
      result = result.filter(s => s.spaceType === this.advSearch.type);
    }

    result = multiSort(result, [this.sortLevel1, this.sortLevel2, this.sortLevel3]);

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
    this.snapshotBeforeEdit = null;
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
    this.snapshotBeforeEdit = { ...space };
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

  private spaceWriteBody() {
    return {
      name: this.form.name,
      capacity: this.form.capacity,
      building: this.form.building,
      roomNumber: this.form.roomNumber,
      spaceType: this.form.spaceType,
      status: this.form.status
    };
  }

  submit(): void {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the highlighted fields.');
      return;
    }

    const body = this.spaceWriteBody();
    const restoreId = this.selectedId;
    const previous = this.snapshotBeforeEdit;

    if (this.isEditing && restoreId !== null) {
      this.http.put<CollaborativeSpace>(
        `${environment.apiUrl}/api/collaborative-spaces/${restoreId}`,
        body
      ).subscribe({
        next: () => {
          this.loadSpaces();
          this.showForm = false;
          this.snapshotBeforeEdit = null;
          if (previous) {
            const id = restoreId;
            const prevBody = {
              name: previous.name,
              capacity: previous.capacity,
              building: previous.building,
              roomNumber: previous.roomNumber,
              spaceType: previous.spaceType,
              status: previous.status
            };
            this.toastService.successWithAction(
              'Collaborative space updated.',
              'Undo',
              () => {
                this.http.put(`${environment.apiUrl}/api/collaborative-spaces/${id}`, prevBody)
                  .subscribe({
                    next: () => this.loadSpaces(),
                    error: () => this.toastService.error('Undo failed.')
                  });
              }
            );
          } else {
            this.toastService.success('Collaborative space updated.');
          }
        },
        error: (err) => {
          console.error('Failed to update space', err);
          this.toastService.error('Failed to update collaborative space.');
        }
      });
    } else {
      this.http.post<CollaborativeSpace>(`${environment.apiUrl}/api/collaborative-spaces`, body)
        .subscribe({
          next: (created) => {
            this.loadSpaces();
            this.showForm = false;
            const newId = created?.id;
            if (newId != null) {
              this.toastService.successWithAction(
                'Collaborative space created.',
                'Undo',
                () => {
                  this.http.delete(`${environment.apiUrl}/api/collaborative-spaces/${newId}`)
                    .subscribe({
                      next: () => this.loadSpaces(),
                      error: () => this.toastService.error('Undo failed.')
                    });
                }
              );
            } else {
              this.toastService.success('Collaborative space created.');
            }
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
    const entity = this.spaces.find(s => s.id === id);
    this.pendingDeleteId = null;
    this.http.delete(`${environment.apiUrl}/api/collaborative-spaces/${id}`).subscribe({
      next: () => {
        this.loadSpaces();
        if (entity) {
          const payload = {
            name: entity.name,
            capacity: entity.capacity,
            building: entity.building,
            roomNumber: entity.roomNumber,
            spaceType: entity.spaceType,
            status: entity.status
          };
          this.toastService.successWithAction(
            'Collaborative space deleted.',
            'Undo',
            () => {
              this.http.post(`${environment.apiUrl}/api/collaborative-spaces`, payload)
                .subscribe({
                  next: () => this.loadSpaces(),
                  error: () => this.toastService.error('Undo failed.')
                });
            }
          );
        } else {
          this.toastService.success('Collaborative space deleted.');
        }
      },
      error: (err) => {
        console.error('Failed to delete space', err);
        this.toastService.error('Failed to delete collaborative space.');
      }
    });
  }

  cancel(): void {
    this.showForm = false;
    this.snapshotBeforeEdit = null;
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
