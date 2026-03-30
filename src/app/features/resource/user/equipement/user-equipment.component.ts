import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
import { ReservationService } from '../../../../services/reservation.service';
import { Equipment, EquipmentType, ResourceStatus, ResourceType } from '../../../../models/resource.models';

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

  constructor(private http: HttpClient, private reservationService: ReservationService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.http.get<Equipment[]>(`${environment.apiUrl}/api/equipment`).subscribe({
      next: (data) => { this.equipmentList = data; this.applyFilters(); this.isLoading = false; },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.equipmentList];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q) || e.brand.toLowerCase().includes(q));
    }
    if (this.filterType !== 'ALL') result = result.filter(e => e.equipmentType === this.filterType);
    if (this.availOnly) result = result.filter(e => e.status === ResourceStatus.AVAILABLE);
    result.sort((a, b) => a.name.localeCompare(b.name));
    this.filtered = result;
  }

  toggleAvail(): void { this.availOnly = !this.availOnly; this.applyFilters(); }
  openDetail(item: Equipment): void { this.selectedItem = item; this.showDetailModal = true; this.showReserveModal = false; this.reserveError = ''; this.reserveSuccess = ''; }
  openReserve(item: Equipment): void { this.selectedItem = item; this.showReserveModal = true; this.showDetailModal = false; this.reserveError = ''; this.reserveSuccess = ''; this.startDatetime = ''; this.endDatetime = ''; }
  closeModals(): void { this.showDetailModal = false; this.showReserveModal = false; this.selectedItem = null; this.reserveError = ''; this.reserveSuccess = ''; }

  confirmReservation(): void {
    if (!this.startDatetime || !this.endDatetime) { this.reserveError = 'Please select both start and end times.'; return; }
    if (this.startDatetime >= this.endDatetime) { this.reserveError = 'End time must be after start time.'; return; }
    if (new Date(this.startDatetime) < new Date()) { this.reserveError = 'Cannot reserve in the past.'; return; }
    this.isSubmitting = true;
    this.reserveError = '';
    this.reservationService.create({
      resourceType: ResourceType.EQUIPMENT,
      resourceId: this.selectedItem!.id,
      startDatetime: this.startDatetime + ':00',
      endDatetime: this.endDatetime + ':00'
    }).subscribe({
      next: () => { this.isSubmitting = false; this.reserveSuccess = `Successfully reserved ${this.selectedItem!.name}!`; setTimeout(() => this.closeModals(), 2500); },
      error: (err) => { this.isSubmitting = false; this.reserveError = err.error?.error || 'Reservation failed. Please try again.'; }
    });
  }
}