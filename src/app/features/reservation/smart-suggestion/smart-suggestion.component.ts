// frontend/src/app/features/reservation/smart-suggestion/smart-suggestion.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { SuggestionService } from '../../../services/suggestion.service';
import { ReservationService } from '../../../services/reservation.service';
import { User, UserRole } from '../../../models/user.models';
import { ResourceType, ResourceSuggestionResponse, ReservationRequest } from '../../../models/resource.models';

@Component({
  selector: 'app-smart-suggestion',
  templateUrl: './smart-suggestion.component.html',
  styleUrls: ['./smart-suggestion.component.scss']
})
export class SmartSuggestionComponent implements OnInit {
  currentUser: User | null = null;
  suggestions: ResourceSuggestionResponse[] = [];
  isLoading = false;
  showSuggestionForm = true;
  showReservationModal = false;
  selectedResource: ResourceSuggestionResponse | null = null;

  resourceTypes = Object.values(ResourceType);

  form = {
    resourceType: ResourceType.CLASSROOM,
    minCapacity: null as number | null,
    maxCapacity: null as number | null,
    building: '',
    startDatetime: '',
    endDatetime: '',
    limit: 5
  };

  reservationForm = {
    startDatetime: '',
    endDatetime: ''
  };
 Math = Math;

  constructor(
    private suggestionService: SuggestionService,
    private reservationService: ReservationService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    // Set default times to next hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    this.form.startDatetime = now.toISOString().slice(0, 16);
    
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    this.form.endDatetime = end.toISOString().slice(0, 16);
  }


getSuggestions(): void {
  if (!this.form.startDatetime || !this.form.endDatetime) {
    this.toastService.error('Please select start and end times');
    return;
  }

  this.isLoading = true;
  const request = {
    resourceType: this.form.resourceType,
    minCapacity: this.form.minCapacity || undefined,
    maxCapacity: this.form.maxCapacity || undefined,
    building: this.form.building || undefined,
    startDatetime: new Date(this.form.startDatetime).toISOString(),
    endDatetime: new Date(this.form.endDatetime).toISOString(),
    limit: this.form.limit
  };

  console.log('Sending request:', request); // ← ADD THIS

  this.suggestionService.suggestResources(request).subscribe({
    next: (data) => {
      console.log('Received data:', data); // ← ADD THIS
      console.log('Data structure:', JSON.stringify(data, null, 2)); // ← ADD THIS
      this.suggestions = data;
      this.isLoading = false;
      this.showSuggestionForm = false;
      if (data.length === 0) {
        this.toastService.info('No resources match your criteria. Try adjusting your filters.');
      }
    },
    error: (err) => {
      console.error('Failed to get suggestions', err);
      this.isLoading = false;
      this.toastService.error('Failed to get suggestions');
    }
  });
}

  openReservationModal(resource: ResourceSuggestionResponse): void {
    this.selectedResource = resource;
    this.reservationForm.startDatetime = this.form.startDatetime;
    this.reservationForm.endDatetime = this.form.endDatetime;
    this.showReservationModal = true;
  }

  confirmReservation(): void {
    if (!this.selectedResource) return;

    const request: ReservationRequest = {
      resourceType: this.selectedResource.resourceType,
      resourceId: this.selectedResource.id,
      startDatetime: new Date(this.reservationForm.startDatetime).toISOString(),
      endDatetime: new Date(this.reservationForm.endDatetime).toISOString()
    };

    this.reservationService.create(request).subscribe({
      next: (response) => {
        this.toastService.success(`Successfully reserved ${this.selectedResource!.name}`);
        this.showReservationModal = false;
        this.selectedResource = null;
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to create reservation');
      }
    });
  }

  resetForm(): void {
    this.showSuggestionForm = true;
    this.suggestions = [];
    this.form = {
      resourceType: ResourceType.CLASSROOM,
      minCapacity: null,
      maxCapacity: null,
      building: '',
      startDatetime: this.form.startDatetime,
      endDatetime: this.form.endDatetime,
      limit: 5
    };
  }

  backToForm(): void {
    this.showSuggestionForm = true;
    this.suggestions = [];
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  }

  getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent Match';
    if (score >= 50) return 'Good Match';
    return 'Fair Match';
  }
}