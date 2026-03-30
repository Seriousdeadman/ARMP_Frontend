import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
import { AuthService } from '../../../../services/auth.service';
import { ReservationService, ConflictAlternative, SmartBookingResponse } from '../../../../services/reservation.service';
import { CollaborativeSpace, SpaceType, ResourceStatus, ResourceType, ReservationRequest } from '../../../../models/resource.models';

@Component({
  selector: 'app-user-collaborative-space',
  standalone: false,
  templateUrl: './user-collaborative-space.component.html',
  styleUrls: ['../../user-resource.shared.scss', './user-collaborative-space.component.scss']
})
export class UserCollaborativeSpaceComponent implements OnInit {

  spaces: CollaborativeSpace[] = [];
  filtered: CollaborativeSpace[] = [];
  isLoading = true;
  availOnly = false;
  searchQuery = '';
  filterType = 'ALL';
  sortBy = 'name';

  spaceTypes = Object.values(SpaceType);

  selectedSpace: CollaborativeSpace | null = null;
  showDetailModal = false;
  showReserveModal = false;

  startDatetime = '';
  endDatetime = '';
  reserveError = '';
  reserveSuccess = '';
  isSubmitting = false;

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
    return Math.max(...this.spaces.map(s => s.capacity), 1);
  }

  capPct(s: CollaborativeSpace): number {
    return Math.round((s.capacity / this.maxCapacity) * 100);
  }

  load(): void {
    this.http.get<CollaborativeSpace[]>(`${environment.apiUrl}/api/collaborative-spaces`).subscribe({
      next: (data) => { 
        this.spaces = data; 
        this.applyFilters(); 
        this.isLoading = false; 
      },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.spaces];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.building.toLowerCase().includes(q)
      );
    }

    if (this.filterType !== 'ALL') {
      result = result.filter(s => s.spaceType === this.filterType);
    }

    if (this.availOnly) {
      result = result.filter(s => s.status === ResourceStatus.AVAILABLE);
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

  openDetail(space: CollaborativeSpace): void {
    this.selectedSpace = space;
    this.showDetailModal = true;
    this.showReserveModal = false;
    this.reserveError = '';
    this.reserveSuccess = '';
  }

  openReserve(space: CollaborativeSpace): void {
    this.selectedSpace = space;
    this.showReserveModal = true;
    this.showDetailModal = false;
    this.reserveError = '';
    this.reserveSuccess = '';
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
    this.selectedSpace = null;
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
      resourceType: ResourceType.COLLABORATIVE_SPACE,
      resourceId: this.selectedSpace!.id,
      startDatetime: this.startDatetime + ':00',
      endDatetime: this.endDatetime + ':00'
    };

    this.reservationService.smartBook(request).subscribe({
      next: (response: SmartBookingResponse) => {
        this.isSubmitting = false;
        
        if (response.conflict === false && response.reservation) {
          this.reserveSuccess = `Successfully reserved ${this.selectedSpace!.name}!`;
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
    if (this.selectedSpace) {
      this.openReserve(this.selectedSpace);
    }
  }

  onTryDifferentTime(): void {
    this.showConflictResolver = false;
    this.pendingRequest = null;
    this.pendingAlternatives = [];
    if (this.selectedSpace) {
      this.openReserve(this.selectedSpace);
    }
  }
}