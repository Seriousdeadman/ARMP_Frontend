import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResourceExportService } from '../../../services/resource-export.service';
import { User, UserRole } from '../../../models/user.models';
import { Equipment, EquipmentType, ResourceStatus } from '../../../models/resource.models';

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

  searchQuery = '';
  filterStatus = 'ALL';
  filterType = 'ALL';
  sortField: keyof Equipment = 'name';
  sortAsc = true;

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

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.brand.toLowerCase().includes(q) ||
        e.model.toLowerCase().includes(q)
      );
    }

    if (this.filterStatus !== 'ALL') {
      result = result.filter(e => e.status === this.filterStatus);
    }

    if (this.filterType !== 'ALL') {
      result = result.filter(e => e.equipmentType === this.filterType);
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

  setSort(field: keyof Equipment): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
  }

  sortIcon(field: keyof Equipment): string {
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

  submit(): void {
    if (!this.validateForm()) {
      this.toastService.error('Please fix the highlighted fields.');
      return;
    }

    if (this.isEditing && this.selectedId !== null) {
      this.http.put<Equipment>(
        `${environment.apiUrl}/api/equipment/${this.selectedId}`,
        this.form
      ).subscribe({
        next: (updated) => {
          this.equipmentList = this.equipmentList.map(e =>
            e.id === this.selectedId ? updated : e
          );
          this.showForm = false;
          this.toastService.success('Equipment updated.');
        },
        error: (err) => {
          console.error('Failed to update equipment', err);
          this.toastService.error('Failed to update equipment.');
        }
      });
    } else {
      this.http.post<Equipment>(
        `${environment.apiUrl}/api/equipment`,
        this.form
      ).subscribe({
        next: (created) => {
          this.equipmentList.push(created);
          this.showForm = false;
          this.toastService.success('Equipment created.');
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
    this.pendingDeleteId = null;
    this.http.delete(`${environment.apiUrl}/api/equipment/${id}`).subscribe({
      next: () => {
        this.equipmentList = this.equipmentList.filter(e => e.id !== id);
      },
      error: (err) => {
        console.error('Failed to delete equipment', err);
        this.toastService.error('Failed to delete equipment.');
      }
    });
  }

  cancel(): void {
    this.showForm = false;
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
