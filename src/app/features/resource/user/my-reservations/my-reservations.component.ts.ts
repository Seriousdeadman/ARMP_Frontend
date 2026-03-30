import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../../../../services/reservation.service';
import { ReservationResponse, ReservationStatus, ResourceType } from '../../../../models/resource.models';

@Component({
  selector: 'app-my-reservations',
  standalone: false,
  templateUrl: './my-reservations.component.html',
  styleUrls: ['../../user-resource.shared.scss', './my-reservations.component.scss']
})
export class MyReservationsComponent implements OnInit {

  reservations: ReservationResponse[] = [];
  filtered: ReservationResponse[] = [];
  isLoading = true;

  searchQuery = '';
  filterType = 'ALL';
  filterStatus = 'ALL';
  sortBy = 'upcoming';

  resourceTypes = Object.values(ResourceType);
  statusOptions = Object.values(ReservationStatus);

  confirmCancelId: number | null = null;
  isCancelling = false;

  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    this.load();
  }

  get totalCount(): number { return this.reservations.length; }
  get activeCount(): number { return this.reservations.filter(r => r.status === ReservationStatus.ACTIVE).length; }
  get cancelledCount(): number { return this.reservations.filter(r => r.status === ReservationStatus.CANCELLED).length; }

  load(): void {
    this.reservationService.getMyReservations().subscribe({
      next: (data) => {
        this.reservations = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.reservations];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r => r.resourceName.toLowerCase().includes(q));
    }

    if (this.filterType !== 'ALL') {
      result = result.filter(r => r.resourceType === this.filterType);
    }

    if (this.filterStatus !== 'ALL') {
      result = result.filter(r => r.status === this.filterStatus);
    }

    result.sort((a, b) =>
      this.sortBy === 'upcoming'
        ? new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.filtered = result;
  }

  formatDateTime(dt: string): string {
    return new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatDate(dt: string): string {
    return new Date(dt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  getDuration(start: string, end: string): string {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
  }

  isUpcoming(start: string): boolean {
    return new Date(start) > new Date();
  }

  askCancel(id: number): void {
    this.confirmCancelId = id;
  }

  dismissCancel(): void {
    this.confirmCancelId = null;
  }

  confirmCancel(): void {
    if (this.confirmCancelId === null) return;
    this.isCancelling = true;
    this.reservationService.cancel(this.confirmCancelId).subscribe({
      next: (updated) => {
        this.reservations = this.reservations.map(r =>
          r.id === this.confirmCancelId ? updated : r
        );
        this.applyFilters();
        this.confirmCancelId = null;
        this.isCancelling = false;
      },
      error: () => {
        this.isCancelling = false;
        this.confirmCancelId = null;
      }
    });
  }

  getResourceBeingCancelled(): ReservationResponse | undefined {
    return this.reservations.find(r => r.id === this.confirmCancelId);
  }
}