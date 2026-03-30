import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
import { AuthService } from '../../../../services/auth.service';
import { ReservationService, ConflictAlternative, SmartBookingResponse } from '../../../../services/reservation.service';
import { Laboratory, LabType, ResourceStatus, ResourceType, ReservationRequest } from '../../../../models/resource.models';

@Component({
  selector: 'app-user-laboratory',
  standalone: false,
  templateUrl: './user-laboratory.component.html',
  styleUrls: ['../../user-resource.shared.scss', './user-laboratory.component.scss']
})
export class UserLaboratoryComponent implements OnInit {

  laboratories: Laboratory[] = [];
  filtered: Laboratory[] = [];
  isLoading = true;
  availOnly = false;
  searchQuery = '';
  filterType = 'ALL';
  sortBy = 'name';

  labTypes = Object.values(LabType);

  selectedLab: Laboratory | null = null;
  showDetailModal = false;
  showReserveModal = false;

  startDatetime = '';
  endDatetime = '';
  reserveError = '';
  reserveSuccess = '';
  isSubmitting = false;

  // Conflict resolver properties
  showConflictResolver = false;
  pendingRequest: ReservationRequest | null = null;
  pendingAlternatives: ConflictAlternative[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get maxCapacity(): number {
    return Math.max(...this.laboratories.map(l => l.capacity), 1);
  }

  capPct(l: Laboratory): number {
    return Math.round((l.capacity / this.maxCapacity) * 100);
  }

  load(): void {
    this.http.get<Laboratory[]>(`${environment.apiUrl}/api/laboratories`).subscribe({
      next: (data) => { 
        this.laboratories = data; 
        this.applyFilters(); 
        this.isLoading = false; 
      },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.laboratories];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.building.toLowerCase().includes(q)
      );
    }

    if (this.filterType !== 'ALL') {
      result = result.filter(l => l.labType === this.filterType);
    }

    if (this.availOnly) {
      result = result.filter(l => l.status === ResourceStatus.AVAILABLE);
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

  openDetail(lab: Laboratory): void {
    this.selectedLab = lab;
    this.showDetailModal = true;
    this.showReserveModal = false;
    this.reserveError = '';
    this.reserveSuccess = '';
  }

  openReserve(lab: Laboratory): void {
    this.selectedLab = lab;
    this.showReserveModal = true;
    this.showDetailModal = false;
    this.reserveError = '';
    this.reserveSuccess = '';
    // Set default times (next hour)
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    this.startDatetime = now.toISOString().slice(0, 16);
    
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    this.endDatetime = end.toISOString().slice(0, 16);
  }

  closeModals(): void {
    this.showDetailModal = false;
    this.showReserveModal = false;
    this.selectedLab = null;
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

    const startDate = new Date(this.startDatetime);
    if (startDate < new Date()) {
      this.reserveError = 'Cannot reserve in the past.';
      return;
    }

    this.isSubmitting = true;
    this.reserveError = '';

    const request: ReservationRequest = {
      resourceType: ResourceType.LABORATORY,
      resourceId: this.selectedLab!.id,
      startDatetime: this.startDatetime + ':00',
      endDatetime: this.endDatetime + ':00'
    };

    this.reservationService.smartBook(request).subscribe({
      next: (response: SmartBookingResponse) => {
        this.isSubmitting = false;
        
        if (response.conflict === false && response.reservation) {
          this.reserveSuccess = `Successfully reserved ${this.selectedLab!.name}!`;
          setTimeout(() => this.closeModals(), 2500);
        } else if (response.conflict === true && response.alternatives) {
          this.pendingRequest = request;
          this.pendingAlternatives = response.alternatives;
          this.showConflictResolver = true;
          this.closeModals();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.reserveError = err.error?.message || 'Reservation failed. Please try again.';
      }
    });
  }

  onConflictResolved(reservation: any): void {
    this.showConflictResolver = false;
    this.pendingRequest = null;
    this.pendingAlternatives = [];
    this.reserveSuccess = `Successfully booked alternative!`;
    setTimeout(() => {
      this.reserveSuccess = '';
      this.load();
    }, 2500);
  }

  onConflictCancelled(): void {
    this.showConflictResolver = false;
    this.pendingRequest = null;
    this.pendingAlternatives = [];
    if (this.selectedLab) {
      this.openReserve(this.selectedLab);
    }
  }

  onTryDifferentTime(): void {
    this.showConflictResolver = false;
    this.pendingRequest = null;
    this.pendingAlternatives = [];
    if (this.selectedLab) {
      this.openReserve(this.selectedLab);
    }
  }
}