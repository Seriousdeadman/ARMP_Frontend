import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole } from '../../../models/user.models';
import { CollaborativeSpace, SpaceType, ResourceStatus } from '../../../models/resource.models';

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

  // ✅ SEARCH / FILTER / SORT
  searchQuery = '';
  filterStatus = 'ALL';
  filterType = 'ALL';
  sortField: keyof CollaborativeSpace = 'name';
  sortAsc = true;

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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadSpaces();
  }

  get isStaff(): boolean {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  // ✅ DISPLAYED LIST
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
  }

  submit(): void {
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
        },
        error: (err) => console.error('Failed to update space', err)
      });
    } else {
      this.http.post<CollaborativeSpace>(
        `${environment.apiUrl}/api/collaborative-spaces`,
        this.form
      ).subscribe({
        next: (created) => {
          this.spaces.push(created);
          this.showForm = false;
        },
        error: (err) => console.error('Failed to create space', err)
      });
    }
  }

  delete(id: number): void {
    if (!confirm('Are you sure you want to delete this space?')) return;
    this.http.delete(`${environment.apiUrl}/api/collaborative-spaces/${id}`).subscribe({
      next: () => {
        this.spaces = this.spaces.filter(s => s.id !== id);
      },
      error: (err) => console.error('Failed to delete space', err)
    });
  }

  cancel(): void {
    this.showForm = false;
  }
}