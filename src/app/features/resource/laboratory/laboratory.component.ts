import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole } from '../../../models/user.models';
import { Laboratory, LabType, ResourceStatus } from '../../../models/resource.models';

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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadLaboratories();
  }

  get isStaff(): boolean {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
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
      labType: LabType.COMPUTER_LAB,
      status: ResourceStatus.AVAILABLE
    };
    this.showForm = true;
  }

  openEdit(lab: Laboratory): void {
    this.isEditing = true;
    this.selectedId = lab.id;
    this.form = {
      name: lab.name,
      capacity: lab.capacity,
      building: lab.building,
      roomNumber: lab.roomNumber,
      labType: lab.labType,
      status: lab.status
    };
    this.showForm = true;
  }

  submit(): void {
    if (this.isEditing && this.selectedId !== null) {
      this.http.put<Laboratory>(
        `${environment.apiUrl}/api/laboratories/${this.selectedId}`,
        this.form
      ).subscribe({
        next: (updated) => {
          this.laboratories = this.laboratories.map(l =>
            l.id === this.selectedId ? updated : l
          );
          this.showForm = false;
        },
        error: (err) => console.error('Failed to update laboratory', err)
      });
    } else {
      this.http.post<Laboratory>(
        `${environment.apiUrl}/api/laboratories`,
        this.form
      ).subscribe({
        next: (created) => {
          this.laboratories.push(created);
          this.showForm = false;
        },
        error: (err) => console.error('Failed to create laboratory', err)
      });
    }
  }

  delete(id: number): void {
    if (!confirm('Are you sure you want to delete this laboratory?')) return;
    this.http.delete(`${environment.apiUrl}/api/laboratories/${id}`).subscribe({
      next: () => {
        this.laboratories = this.laboratories.filter(l => l.id !== id);
      },
      error: (err) => console.error('Failed to delete laboratory', err)
    });
  }

  cancel(): void {
    this.showForm = false;
  }
}