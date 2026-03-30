import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
import { AuthService } from '../../../../services/auth.service';
import { ReservationService } from '../../../../services/reservation.service';
import { Classroom, ClassroomType, ResourceStatus, ResourceType } from '../../../../models/resource.models';

@Component({
  selector: 'app-user-classroom',
  standalone: false,
  templateUrl: './user-classroom.component.html',
  styleUrls: ['../../user-resource.shared.scss', './user-classroom.component.scss']
})
export class UserClassroomComponent implements OnInit {

  classrooms: Classroom[] = [];
  filtered: Classroom[] = [];
  isLoading = true;
  availOnly = false;
  searchQuery = '';
  filterType = 'ALL';
  sortBy = 'name';

  classroomTypes = Object.values(ClassroomType);

  selectedRoom: Classroom | null = null;
  showDetailModal = false;
  showReserveModal = false;

  startDatetime = '';
  endDatetime = '';
  reserveError = '';
  reserveSuccess = '';
  isSubmitting = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get maxCapacity(): number {
    return Math.max(...this.classrooms.map(c => c.capacity), 1);
  }

  capPct(c: Classroom): number {
    return Math.round((c.capacity / this.maxCapacity) * 100);
  }

  load(): void {
    this.http.get<Classroom[]>(`${environment.apiUrl}/api/classrooms`).subscribe({
      next: (data) => { this.classrooms = data; this.applyFilters(); this.isLoading = false; },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.classrooms];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.building.toLowerCase().includes(q)
      );
    }

    if (this.filterType !== 'ALL') {
      result = result.filter(c => c.classroomType === this.filterType);
    }

    if (this.availOnly) {
      result = result.filter(c => c.status === ResourceStatus.AVAILABLE);
    }

    result.sort((a, b) =>
      this.sortBy === 'capacity'
        ? b.capacity - a.capacity
        : a.name.localeCompare(b.name)
    );

    this.filtered = result;
  }

  toggleAvail(): void {
    this.availOnly = !this.availOnly;
    this.applyFilters();
  }

  openDetail(room: Classroom): void {
    this.selectedRoom = room;
    this.showDetailModal = true;
    this.showReserveModal = false;
    this.reserveError = '';
    this.reserveSuccess = '';
  }

  openReserve(room: Classroom): void {
    this.selectedRoom = room;
    this.showReserveModal = true;
    this.showDetailModal = false;
    this.reserveError = '';
    this.reserveSuccess = '';
    this.startDatetime = '';
    this.endDatetime = '';
  }

  closeModals(): void {
    this.showDetailModal = false;
    this.showReserveModal = false;
    this.selectedRoom = null;
    this.reserveError = '';
    this.reserveSuccess = '';
  }

  confirmReservation(): void {
    if (!this.startDatetime || !this.endDatetime) {
      this.reserveError = 'Please select both start and end times.';
      return;
    }

    if (this.startDatetime >= this.endDatetime) {
      this.reserveError = 'End time must be after start time.';
      return;
    }

    if (new Date(this.startDatetime) < new Date()) {
      this.reserveError = 'Cannot reserve in the past.';
      return;
    }

    this.isSubmitting = true;
    this.reserveError = '';

    this.reservationService.create({
      resourceType: ResourceType.CLASSROOM,
      resourceId: this.selectedRoom!.id,
      startDatetime: this.startDatetime + ':00',
      endDatetime: this.endDatetime + ':00'
    }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.reserveSuccess = `Successfully reserved ${this.selectedRoom!.name}!`;
        setTimeout(() => this.closeModals(), 2500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.reserveError = err.error?.error || 'Reservation failed. Please try again.';
      }
    });
  }
}