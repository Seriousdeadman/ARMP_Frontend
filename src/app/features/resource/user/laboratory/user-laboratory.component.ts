import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
import { ReservationService } from '../../../../services/reservation.service';
import { Laboratory, LabType, ResourceStatus, ResourceType } from '../../../../models/resource.models';

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

  constructor(private http: HttpClient, private reservationService: ReservationService) {}

  ngOnInit(): void { this.load(); }

  get maxCapacity(): number { return Math.max(...this.laboratories.map(l => l.capacity), 1); }
  capPct(l: Laboratory): number { return Math.round((l.capacity / this.maxCapacity) * 100); }

  load(): void {
    this.http.get<Laboratory[]>(`${environment.apiUrl}/api/laboratories`).subscribe({
      next: (data) => { this.laboratories = data; this.applyFilters(); this.isLoading = false; },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.laboratories];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(q) || l.building.toLowerCase().includes(q));
    }
    if (this.filterType !== 'ALL') result = result.filter(l => l.labType === this.filterType);
    if (this.availOnly) result = result.filter(l => l.status === ResourceStatus.AVAILABLE);
    result.sort((a, b) => this.sortBy === 'capacity' ? b.capacity - a.capacity : a.name.localeCompare(b.name));
    this.filtered = result;
  }

  toggleAvail(): void { this.availOnly = !this.availOnly; this.applyFilters(); }
  openDetail(lab: Laboratory): void { this.selectedLab = lab; this.showDetailModal = true; this.showReserveModal = false; this.reserveError = ''; this.reserveSuccess = ''; }
  openReserve(lab: Laboratory): void { this.selectedLab = lab; this.showReserveModal = true; this.showDetailModal = false; this.reserveError = ''; this.reserveSuccess = ''; this.startDatetime = ''; this.endDatetime = ''; }
  closeModals(): void { this.showDetailModal = false; this.showReserveModal = false; this.selectedLab = null; this.reserveError = ''; this.reserveSuccess = ''; }

  confirmReservation(): void {
    if (!this.startDatetime || !this.endDatetime) { this.reserveError = 'Please select both start and end times.'; return; }
    if (this.startDatetime >= this.endDatetime) { this.reserveError = 'End time must be after start time.'; return; }
    if (new Date(this.startDatetime) < new Date()) { this.reserveError = 'Cannot reserve in the past.'; return; }
    this.isSubmitting = true;
    this.reserveError = '';
    this.reservationService.create({
      resourceType: ResourceType.LABORATORY,
      resourceId: this.selectedLab!.id,
      startDatetime: this.startDatetime + ':00',
      endDatetime: this.endDatetime + ':00'
    }).subscribe({
      next: () => { this.isSubmitting = false; this.reserveSuccess = `Successfully reserved ${this.selectedLab!.name}!`; setTimeout(() => this.closeModals(), 2500); },
      error: (err) => { this.isSubmitting = false; this.reserveError = err.error?.error || 'Reservation failed. Please try again.'; }
    });
  }
}