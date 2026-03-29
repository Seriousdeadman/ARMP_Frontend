import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
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

  // ✅ SEARCH / FILTER / SORT
  searchQuery = '';
  filterStatus = 'ALL';
  filterType = 'ALL';
  sortField: keyof Equipment = 'name';
  sortAsc = true;

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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadEquipment();
  }

  get isStaff(): boolean {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  // ✅ FIXED SORT LOGIC
  get displayedEquipment(): Equipment[] {
    let result = [...this.equipmentList];

    // 🔍 SEARCH
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.brand.toLowerCase().includes(q) ||
        e.model.toLowerCase().includes(q)
      );
    }

    // 🎯 FILTER STATUS
    if (this.filterStatus !== 'ALL') {
      result = result.filter(e => e.status === this.filterStatus);
    }

    // 🎯 FILTER TYPE
    if (this.filterType !== 'ALL') {
      result = result.filter(e => e.equipmentType === this.filterType);
    }

    // 🔀 SORT (FIXED HERE)
    result.sort((a, b) => {
      const valA = a[this.sortField];
      const valB = b[this.sortField];

      if (valA === undefined || valB === undefined) return 0;

      // ✅ FIX: check BOTH are numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortAsc ? valA - valB : valB - valA;
      }

      // string fallback
      return this.sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return result;
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
  }

  submit(): void {
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
        },
        error: (err) => console.error('Failed to update equipment', err)
      });
    } else {
      this.http.post<Equipment>(
        `${environment.apiUrl}/api/equipment`,
        this.form
      ).subscribe({
        next: (created) => {
          this.equipmentList.push(created);
          this.showForm = false;
        },
        error: (err) => console.error('Failed to create equipment', err)
      });
    }
  }

  delete(id: number): void {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    this.http.delete(`${environment.apiUrl}/api/equipment/${id}`).subscribe({
      next: () => {
        this.equipmentList = this.equipmentList.filter(e => e.id !== id);
      },
      error: (err) => console.error('Failed to delete equipment', err)
    });
  }

  cancel(): void {
    this.showForm = false;
  }
}