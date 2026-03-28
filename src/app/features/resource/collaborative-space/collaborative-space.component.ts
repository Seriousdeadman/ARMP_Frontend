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