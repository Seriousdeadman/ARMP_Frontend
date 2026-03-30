// frontend/src/app/features/reservation/conflict-resolver/conflict-resolver.component.ts
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ReservationService, ConflictAlternative } from '../../../services/reservation.service';
import { User } from '../../../models/user.models';
import { ResourceType, ReservationRequest } from '../../../models/resource.models';

@Component({
  selector: 'app-conflict-resolver',
  templateUrl: './conflict-resolver.component.html',
  styleUrls: ['./conflict-resolver.component.scss']
})
export class ConflictResolverComponent implements OnInit {
  
  @Input() originalRequest: ReservationRequest | null = null;
  @Input() alternatives: ConflictAlternative[] = [];
  @Output() resolved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() tryDifferentTime = new EventEmitter<void>();
  
  currentUser: User | null = null;
  isLoading = false;
  alternativesList: ConflictAlternative[] = [];
  selectedAlternative: ConflictAlternative | null = null;
  showAlternatives = false;
  Math = Math;
  
  resourceTypes = Object.values(ResourceType);
  resourcesCache: Map<string, any> = new Map();
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private reservationService: ReservationService
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // If alternatives are provided via input, use them
    if (this.alternatives && this.alternatives.length > 0) {
      this.alternativesList = this.alternatives;
      this.showAlternatives = true;
      this.isLoading = false;
    } else if (this.originalRequest) {
      this.loadResourceNames();
      this.findAlternatives();
    }
  }
  
  loadResourceNames(): void {
    if (!this.originalRequest) return;
    
    const resourceType = this.originalRequest.resourceType.toLowerCase();
    const endpoint = `${environment.apiUrl}/api/${resourceType}s`;
    
    this.http.get<any[]>(endpoint).subscribe({
      next: (resources) => {
        resources.forEach(r => {
          this.resourcesCache.set(`${resourceType}-${r.id}`, r.name);
        });
      },
      error: () => {}
    });
  }
  
  getResourceName(resourceId: number, resourceType: ResourceType): string {
    const key = `${resourceType.toLowerCase()}-${resourceId}`;
    return this.resourcesCache.get(key) || `Resource ${resourceId}`;
  }
  
  findAlternatives(): void {
    if (!this.originalRequest) return;
    
    this.isLoading = true;
    
    const request = {
      resourceType: this.originalRequest.resourceType,
      resourceId: this.originalRequest.resourceId,
      startDatetime: this.originalRequest.startDatetime,
      endDatetime: this.originalRequest.endDatetime
    };
    
    this.reservationService.resolveConflict(request).subscribe({
      next: (alternatives) => {
        this.alternativesList = alternatives;
        this.showAlternatives = true;
        this.isLoading = false;
        
        if (alternatives.length === 0) {
          this.toastService.info('No alternatives found. Try different times or resource types.');
        }
      },
      error: (err) => {
        console.error('Failed to find alternatives', err);
        this.isLoading = false;
        this.toastService.error('Failed to find alternatives');
      }
    });
  }
  
  selectAlternative(alt: ConflictAlternative): void {
    this.selectedAlternative = alt;
  }
  
  bookAlternative(): void {
    if (!this.selectedAlternative) return;
    
    const request: ReservationRequest = {
      resourceType: this.selectedAlternative.resourceType,
      resourceId: this.selectedAlternative.id,
      startDatetime: this.selectedAlternative.startDatetime,
      endDatetime: this.selectedAlternative.endDatetime
    };
    
    this.isLoading = true;
    
    this.reservationService.create(request).subscribe({
      next: (reservation) => {
        this.toastService.success(`Successfully booked ${this.selectedAlternative!.name}`);
        this.resolved.emit(reservation);
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to book');
        this.isLoading = false;
      }
    });
  }
  
  keepOriginal(): void {
    this.cancelled.emit();
  }
  
  tryDifferentTimes(): void {
    this.tryDifferentTime.emit();
  }
  
  getScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }
  
  getScoreIcon(score: number): string {
    if (score >= 80) return '🎯';
    if (score >= 60) return '👍';
    if (score >= 40) return '🤔';
    return '⚠️';
  }
  
  getChangeTypeIcon(changeType: string): string {
    if (!changeType) return '💡';
    switch (changeType) {
      case 'SAME_TIME': return '⏰';
      case 'TIME_SHIFT': return '🕐';
      case 'ALTERNATIVE_TYPE': return '🔄';
      default: return '💡';
    }
  }
  
  getChangeTypeLabel(changeType: string): string {
    if (!changeType) return 'Alternative';
    switch (changeType) {
      case 'SAME_TIME': return 'Same Time';
      case 'TIME_SHIFT': return 'Time Shift';
      case 'ALTERNATIVE_TYPE': return 'Different Type';
      default: return 'Alternative';
    }
  }
  
  getChangeTypeClass(changeType: string): string {
    if (!changeType) return 'default';
    return changeType.toLowerCase();
  }
  
  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Invalid date';
    }
  }
  
  formatFullTime(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString([], { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return 'Invalid date';
    }
  }
  
  getDurationHours(start: string | null | undefined, end: string | null | undefined): number {
    if (!start || !end) return 0;
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      return Math.round(hours * 10) / 10;
    } catch {
      return 0;
    }
  }
  // Add this helper method to format dates without timezone conversion
formatLocalDateTime(dateStr: string): string {
  if (!dateStr) return '';
  // Remove the timezone conversion - just display as is
  const date = new Date(dateStr);
  // Check if it's a valid date
  if (isNaN(date.getTime())) return dateStr;
  // Return formatted local time
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Update formatFullTime similarly
formatFullLocalTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString([], { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
}
}