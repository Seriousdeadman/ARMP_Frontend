import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { Equipment, EquipmentType, ResourceStatus } from '../../../models/resource.models';
import { containsIgnoreCase, multiSort } from '../../../utils/resource-list.utils';

@Component({
  selector: 'app-equipment',
  standalone: false,
  templateUrl: './equipment.component.html',
  styleUrl: './equipment.component.scss'
})
export class EquipmentComponent implements OnInit {

  currentUser: User | null = null;
  equipmentList: Equipment[] = [];
  isLoading = true;
  showForm = false;
  isEditing = false;
  selectedId: number | null = null;
  private snapshotBeforeEdit: Equipment | null = null;

  advSearch = {
    nameContains: '',
    brandContains: '',
    modelContains: '',
    status: 'ALL' as 'ALL' | ResourceStatus,
    type: 'ALL' as 'ALL' | EquipmentType
  };

  sortLevel1: { field: keyof Equipment | ''; asc: boolean } = { field: 'name', asc: true };
  sortLevel2: { field: keyof Equipment | ''; asc: boolean } = { field: '', asc: true };
  sortLevel3: { field: keyof Equipment | ''; asc: boolean } = { field: '', asc: true };

  readonly sortFieldOptions: { value: keyof Equipment | ''; label: string }[] = [
    { value: '', label: '— None —' },
    { value: 'name', label: 'Name' },
    { value: 'brand', label: 'Brand' },
    { value: 'model', label: 'Model' },
    { value: 'equipmentType', label: 'Type' },
    { value: 'status', label: 'Status' }
  ];

  page = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25];

  deleteDialogOpen = false;
  pendingDeleteId: number | null = null;

  fieldErrors: Partial<Record<'name' | 'brand' | 'model', string>> = {};

  equipmentTypes = Object.values(EquipmentType);
  statusOptions = Object.values(ResourceStatus);

  form = {
    name: '',
    brand: '',
    model: '',
    equipmentType: EquipmentType.COMPUTER,
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
    this.loadEquipment();
  }

  get isStaff(): boolean {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  get displayedEquipment(): Equipment[] {
    let result = [...this.equipmentList];

    if (this.advSearch.nameContains.trim()) {
      result = result.filter(e => containsIgnoreCase(e.name, this.advSearch.nameContains));
    }
    if (this.advSearch.brandContains.trim()) {
      result = result.filter(e => containsIgnoreCase(e.brand, this.advSearch.brandContains));
    }
    if (this.advSearch.modelContains.trim()) {
      result = result.filter(e => containsIgnoreCase(e.model, this.advSearch.modelContains));
    }

    if (this.advSearch.status !== 'ALL') {
      result = result.filter(e => e.status === this.advSearch.status);
    }
    if (this.advSearch.type !== 'ALL') {
      result = result.filter(e => e.equipmentType === this.advSearch.type);
    }

    result = multiSort(result, [this.sortLevel1, this.sortLevel2, this.sortLevel3]);

    return result;
  }

  get effectivePage(): number {
    return Math.min(Math.max(1, this.page), this.totalPages);
  }

  get paginatedEquipment(): Equipment[] {
    const start = (this.effectivePage - 1) * this.pageSize;
    return this.displayedEquipment.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.displayedEquipment.length / this.pageSize));
  }

  get rangeStart(): number {
    const n = this.displayedEquipment.length;
    if (n === 0) return 0;
    return (this.effectivePage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    const n = this.displayedEquipment.length;
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
      brandContains: '',
      modelContains: '',
      status: 'ALL',
      type: 'ALL'
    };
    this.sortLevel1 = { field: 'name', asc: true };
    this.sortLevel2 = { field: '', asc: true };
    this.sortLevel3 = { field: '', asc: true };
    this.page = 1;
  }

  loadEquipment(): void {
    this.http.get<Equipment[]>(`${environment.apiUrl}/api/equipment`).subscribe({
      next: (data) => {
        this.equipmentList = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load equipment', err);
        this.isLoading = false;
        this.toastService.error('Failed to load equipment.');
      }
    });
  }

  openCreate(): void {
    this.isEditing = false;
    this.selectedId = null;
    this.snapshotBeforeEdit = null;
    this.form = {
      name: '',
      brand: '',
      model: '',
      equipmentType: EquipmentType.COMPUTER,
      status: ResourceStatus.AVAILABLE
    };
    this.showForm = true;
    this.fieldErrors = {};
  }

  openEdit(equipment: Equipment): void {
    this.isEditing = true;
    this.selectedId = equipment.id;
    this.snapshotBeforeEdit = { ...equipment };
    this.form = {
      name: equipment.name,
      brand: equipment.brand,
      model: equipment.model,
      equipmentType: equipment.equipmentType,
      status: equipment.status
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
    if (!this.form.brand?.trim()) {
      this.fieldErrors.brand = 'Brand is required.';
      ok = false;
    }
    if (!this.form.model?.trim()) {
      this.fieldErrors.model = 'Model is required.';
      ok = false;
    }
    return ok;
  }

  private equipmentWriteBody() {
    return {
      name: this.form.name,
      brand: this.form.brand,
      model: this.form.model,
      equipmentType: this.form.equipmentType,
      status: this.form.status
    };
  }

  submit(): void {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the highlighted fields.');
      return;
    }

    const body = this.equipmentWriteBody();
    const restoreId = this.selectedId;
    const previous = this.snapshotBeforeEdit;

    if (this.isEditing && restoreId !== null) {
      this.http.put<Equipment>(
        `${environment.apiUrl}/api/equipment/${restoreId}`,
        body
      ).subscribe({
        next: () => {
          this.loadEquipment();
          this.showForm = false;
          this.snapshotBeforeEdit = null;
          if (previous) {
            const id = restoreId;
            const prevBody = {
              name: previous.name,
              brand: previous.brand,
              model: previous.model,
              equipmentType: previous.equipmentType,
              status: previous.status
            };
            this.toastService.successWithAction(
              'Equipment updated.',
              'Undo',
              () => {
                this.http.put(`${environment.apiUrl}/api/equipment/${id}`, prevBody)
                  .subscribe({
                    next: () => this.loadEquipment(),
                    error: () => this.toastService.error('Undo failed.')
                  });
              }
            );
          } else {
            this.toastService.success('Equipment updated.');
          }
        },
        error: (err) => {
          console.error('Failed to update equipment', err);
          this.toastService.error('Failed to update equipment.');
        }
      });
    } else {
      this.http.post<Equipment>(`${environment.apiUrl}/api/equipment`, body)
        .subscribe({
          next: (created) => {
            this.loadEquipment();
            this.showForm = false;
            const newId = created?.id;
            if (newId != null) {
              this.toastService.successWithAction(
                'Equipment created.',
                'Undo',
                () => {
                  this.http.delete(`${environment.apiUrl}/api/equipment/${newId}`)
                    .subscribe({
                      next: () => this.loadEquipment(),
                      error: () => this.toastService.error('Undo failed.')
                    });
                }
              );
            } else {
              this.toastService.success('Equipment created.');
            }
          },
          error: (err) => {
            console.error('Failed to create equipment', err);
            this.toastService.error('Failed to create equipment.');
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
    const entity = this.equipmentList.find(e => e.id === id);
    this.pendingDeleteId = null;
    this.http.delete(`${environment.apiUrl}/api/equipment/${id}`).subscribe({
      next: () => {
        this.loadEquipment();
        if (entity) {
          const payload = {
            name: entity.name,
            brand: entity.brand,
            model: entity.model,
            equipmentType: entity.equipmentType,
            status: entity.status
          };
          this.toastService.successWithAction(
            'Equipment deleted.',
            'Undo',
            () => {
              this.http.post(`${environment.apiUrl}/api/equipment`, payload)
                .subscribe({
                  next: () => this.loadEquipment(),
                  error: () => this.toastService.error('Undo failed.')
                });
            }
          );
        } else {
          this.toastService.success('Equipment deleted.');
        }
      },
      error: (err) => {
        console.error('Failed to delete equipment', err);
        this.toastService.error('Failed to delete equipment.');
      }
    });
  }

  cancel(): void {
    this.showForm = false;
    this.snapshotBeforeEdit = null;
  }

  exportFilteredCsv(): void {
    const rows = this.displayedEquipment.map(e => ({
      ID: e.id,
      Name: e.name,
      Brand: e.brand,
      Model: e.model,
      Type: e.equipmentType,
      Status: e.status,
      Created: e.createdAt,
      Updated: e.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadCsv('equipment-export', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to CSV.`);
  }

  exportFilteredXlsx(): void {
    const rows = this.displayedEquipment.map(e => ({
      ID: e.id,
      Name: e.name,
      Brand: e.brand,
      Model: e.model,
      Type: e.equipmentType,
      Status: e.status,
      Created: e.createdAt,
      Updated: e.updatedAt
    }));
    if (!rows.length) {
      this.toastService.info('No rows to export for the current filters.');
      return;
    }
    this.exportService.downloadXlsx('equipment-export', 'Equipment', rows);
    this.toastService.success(`Exported ${rows.length} row(s) to Excel.`);
  }
}
