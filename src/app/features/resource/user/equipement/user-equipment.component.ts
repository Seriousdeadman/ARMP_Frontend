import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
import { ReservationService, ConflictAlternative, SmartBookingResponse } from '../../../../services/reservation.service';
import { Equipment, EquipmentType, ResourceStatus, ResourceType, ReservationRequest } from '../../../../models/resource.models';

@Component({
  selector: 'app-user-equipment',
  standalone: false,
  templateUrl: './user-equipment.component.html',
  styleUrls: ['../../user-resource.shared.scss', './user-equipment.component.scss']
})
export class UserEquipmentComponent implements OnInit {

  equipmentList: Equipment[] = [];
  filtered: Equipment[] = [];
  isLoading = true;
  availOnly = false;
  searchQuery = '';
  filterType = 'ALL';
  sortBy = 'name';
  equipmentTypes = Object.values(EquipmentType);

  selectedItem: Equipment | null = null;
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
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void { 
    this.load(); 
  }

  load(): void {
    this.http.get<Equipment[]>(`${environment.apiUrl}/api/equipment`).subscribe({
      next: (data) => { 
        this.equipmentList = data; 
        this.applyFilters(); 
        this.isLoading = false; 
      },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.equipmentList];
    
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e => 
        e.name.toLowerCase().includes(q) || 
        e.brand.toLowerCase().includes(q) ||
        e.model.toLowerCase().includes(q)
      );
    }
    
    if (this.filterType !== 'ALL') {
      result = result.filter(e => e.equipmentType === this.filterType);
    }
    
    if (this.availOnly) {
      result = result.filter(e => e.status === ResourceStatus.AVAILABLE);
    }
    
    result.sort((a, b) => a.name.localeCompare(b.name));
    this.filtered = result;
  }

  toggleAvail(): void { 
    this.availOnly = !this.availOnly; 
    this.applyFilters(); 
  }

  openDetail(item: Equipment): void { 
    this.selectedItem = item; 
    this.showDetailModal = true; 
    this.showReserveModal = false; 
    this.reserveError = ''; 
    this.reserveSuccess = ''; 
  }

  openReserve(item: Equipment): void { 
    this.selectedItem = item; 
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
    this.selectedItem = null; 
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
      resourceType: ResourceType.EQUIPMENT,
      resourceId: this.selectedItem!.id,
      startDatetime: this.startDatetime + ':00',
      endDatetime: this.endDatetime + ':00'
    };

    // USE SMART BOOK INSTEAD OF REGULAR CREATE
    this.reservationService.smartBook(request).subscribe({
      next: (response: SmartBookingResponse) => {
        this.isSubmitting = false;
        
        if (response.conflict === false && response.reservation) {
          this.reserveSuccess = `Successfully reserved ${this.selectedItem!.name}!`;
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
    if (this.selectedItem) {
      this.openReserve(this.selectedItem);
    }
  }

  onTryDifferentTime(): void {
    this.showConflictResolver = false;
    this.pendingRequest = null;
    this.pendingAlternatives = [];
    if (this.selectedItem) {
      this.openReserve(this.selectedItem);
    }
  }
}