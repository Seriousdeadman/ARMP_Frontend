import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole } from '../../../models/user.models';
import { Classroom, ClassroomType, ResourceStatus } from '../../../models/resource.models';

@Component({
  selector: 'app-classroom',
  standalone: false,
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadClassrooms();
  }

  get isStaff(): boolean {
    return this.currentUser?.role === UserRole.LOGISTICS_STAFF ||
           this.currentUser?.role === UserRole.SUPER_ADMIN;
  }

  loadClassrooms(): void {
    this.http.get<Classroom[]>(`${environment.apiUrl}/api/classrooms`).subscribe({
      next: (data) => {
        this.classrooms = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load classrooms', err);
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
      classroomType: ClassroomType.LECTURE_HALL,
      status: ResourceStatus.AVAILABLE
    };
    this.showForm = true;
  }

  openEdit(classroom: Classroom): void {
    this.isEditing = true;
    this.selectedId = classroom.id;
    this.form = {
      name: classroom.name,
      capacity: classroom.capacity,
      building: classroom.building,
      roomNumber: classroom.roomNumber,
      classroomType: classroom.classroomType,
      status: classroom.status
    };
    this.showForm = true;
  }

  submit(): void {
    if (this.isEditing && this.selectedId !== null) {
      this.http.put<Classroom>(
        `${environment.apiUrl}/api/classrooms/${this.selectedId}`,
        this.form
      ).subscribe({
        next: (updated) => {
          this.classrooms = this.classrooms.map(c =>
            c.id === this.selectedId ? updated : c
          );
          this.showForm = false;
        },
        error: (err) => console.error('Failed to update classroom', err)
      });
    } else {
      this.http.post<Classroom>(
        `${environment.apiUrl}/api/classrooms`,
        this.form
      ).subscribe({
        next: (created) => {
          this.classrooms.push(created);
          this.showForm = false;
        },
        error: (err) => console.error('Failed to create classroom', err)
      });
    }
  }

  delete(id: number): void {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    this.http.delete(`${environment.apiUrl}/api/classrooms/${id}`).subscribe({
      next: () => {
        this.classrooms = this.classrooms.filter(c => c.id !== id);
      },
      error: (err) => console.error('Failed to delete classroom', err)
    });
  }

  cancel(): void {
    this.showForm = false;
  }
}