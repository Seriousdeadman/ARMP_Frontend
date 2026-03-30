// frontend/src/app/features/resource/availability-calendar/availability-calendar.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { AvailabilityService, AvailabilitySlot } from '../../../services/availability.service';
import { ReservationService } from '../../../services/reservation.service';
import { User, UserRole } from '../../../models/user.models';
import { ResourceType, ReservationRequest } from '../../../models/resource.models';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

@Component({
  selector: 'app-availability-calendar',
  templateUrl: './availability-calendar.component.html',
  styleUrls: ['./availability-calendar.component.scss']
})
export class AvailabilityCalendarComponent implements OnInit, OnDestroy, AfterViewInit {
  
  @ViewChild('calendar') calendarElement!: ElementRef;
  
  currentUser: User | null = null;
  isLoading = false;
  
  // Selection state
  selectedResourceType: ResourceType = ResourceType.CLASSROOM;
  selectedResourceId: number | null = null;
  selectedResourceName: string | null = null;
  
  // Resources list
  classrooms: any[] = [];
  laboratories: any[] = [];
  collaborativeSpaces: any[] = [];
  equipment: any[] = [];
  
  // Calendar events
  calendarEvents: EventInput[] = [];
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    editable: false,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    height: 'auto',
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
    slotDuration: '01:00:00',
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    datesSet: this.handleDatesSet.bind(this)
  };
  
  // Reservation modal
  showReservationModal = false;
  selectedSlot: {
    start: string;
    end: string;
    resourceId: number;
    resourceName: string;
  } | null = null;
  
  reservationForm = {
    startDatetime: '',
    endDatetime: ''
  };
  
  resourceTypes = Object.values(ResourceType);
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private availabilityService: AvailabilityService,
    private reservationService: ReservationService
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadResources();
  }
  
  ngAfterViewInit(): void {
    // Calendar is initialized via FullCalendar CDN in template
  }
  
  ngOnDestroy(): void {
    // Cleanup if needed
  }
  
  loadResources(): void {
    this.isLoading = true;
    
    // Load all resource types
    this.http.get<any[]>(`${environment.apiUrl}/api/classrooms`).subscribe({
      next: (data) => {
        this.classrooms = data.filter(r => r.status === 'AVAILABLE');
        this.isLoading = false;
      },
      error: () => this.toastService.error('Failed to load classrooms')
    });
    
    this.http.get<any[]>(`${environment.apiUrl}/api/laboratories`).subscribe({
      next: (data) => {
        this.laboratories = data.filter(r => r.status === 'AVAILABLE');
      },
      error: () => this.toastService.error('Failed to load laboratories')
    });
    
    this.http.get<any[]>(`${environment.apiUrl}/api/collaborative-spaces`).subscribe({
      next: (data) => {
        this.collaborativeSpaces = data.filter(r => r.status === 'AVAILABLE');
      },
      error: () => this.toastService.error('Failed to load collaborative spaces')
    });
    
    this.http.get<any[]>(`${environment.apiUrl}/api/equipment`).subscribe({
      next: (data) => {
        this.equipment = data.filter(r => r.status === 'AVAILABLE');
      },
      error: () => this.toastService.error('Failed to load equipment')
    });
  }
  
  onResourceSelect(): void {
    if (this.selectedResourceId) {
      this.loadCalendarEvents();
    }
  }
  
  getCurrentResources(): any[] {
    switch (this.selectedResourceType) {
      case ResourceType.CLASSROOM:
        return this.classrooms;
      case ResourceType.LABORATORY:
        return this.laboratories;
      case ResourceType.COLLABORATIVE_SPACE:
        return this.collaborativeSpaces;
      case ResourceType.EQUIPMENT:
        return this.equipment;
      default:
        return [];
    }
  }
  
  loadCalendarEvents(): void {
    if (!this.selectedResourceId) return;
    
    // Get the calendar view's current date range
    const calendarApi = (window as any).calendar?.getApi();
    if (!calendarApi) return;
    
    const view = calendarApi.view;
    const start = view.activeStart.toISOString();
    const end = view.activeEnd.toISOString();
    
    this.isLoading = true;
    
    this.availabilityService.getResourceAvailability({
      resourceType: this.selectedResourceType,
      resourceId: this.selectedResourceId,
      start: start,
      end: end
    }).subscribe({
      next: (slots) => {
        this.calendarEvents = slots.map(slot => ({
          id: slot.id.toString(),
          title: slot.title,
          start: slot.start,
          end: slot.end,
          backgroundColor: slot.color,
          borderColor: slot.color,
          extendedProps: {
            available: slot.available,
            resourceId: slot.resourceId,
            resourceName: slot.resourceName
          }
        }));
        
        // Update calendar if already initialized
        if (calendarApi) {
          calendarApi.removeAllEvents();
          calendarApi.addEventSource(this.calendarEvents);
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load availability', err);
        this.toastService.error('Failed to load availability');
        this.isLoading = false;
      }
    });
  }
  
  handleDateSelect(selectInfo: any): void {
    if (!this.selectedResourceId) {
      this.toastService.error('Please select a resource first');
      return;
    }
    
    const start = selectInfo.start;
    const end = selectInfo.end;
    
    // Check if the selected time is in the past
    if (start < new Date()) {
      this.toastService.error('Cannot book in the past');
      return;
    }
    
    // Check availability
    this.availabilityService.checkAvailability(
      this.selectedResourceType,
      this.selectedResourceId,
      start.toISOString(),
      end.toISOString()
    ).subscribe({
      next: (isAvailable) => {
        if (isAvailable) {
          this.selectedSlot = {
            start: start.toISOString(),
            end: end.toISOString(),
            resourceId: this.selectedResourceId!,
            resourceName: this.selectedResourceName || 'Selected Resource'
          };
          this.reservationForm.startDatetime = this.formatDateTimeForInput(start);
          this.reservationForm.endDatetime = this.formatDateTimeForInput(end);
          this.showReservationModal = true;
        } else {
          this.toastService.error('This time slot is already booked');
        }
      },
      error: () => this.toastService.error('Failed to check availability')
    });
  }
  
  handleEventClick(clickInfo: any): void {
    const event = clickInfo.event;
    const extendedProps = event.extendedProps;
    
    if (!extendedProps.available) {
      this.toastService.info(`This time slot is already booked`);
    } else {
      // Trigger selection for available slot
      this.handleDateSelect({
        start: event.start,
        end: event.end
      });
    }
  }
  
  handleDatesSet(): void {
    // Reload events when calendar view changes
    this.loadCalendarEvents();
  }
  
  formatDateTimeForInput(date: Date): string {
    return date.toISOString().slice(0, 16);
  }
  
  confirmReservation(): void {
    if (!this.selectedSlot) return;
    
    const request: ReservationRequest = {
      resourceType: this.selectedResourceType,
      resourceId: this.selectedSlot.resourceId,
      startDatetime: new Date(this.reservationForm.startDatetime).toISOString(),
      endDatetime: new Date(this.reservationForm.endDatetime).toISOString()
    };
    
    this.reservationService.create(request).subscribe({
      next: (response) => {
        this.toastService.success(`Successfully reserved ${this.selectedSlot!.resourceName}`);
        this.showReservationModal = false;
        this.selectedSlot = null;
        this.loadCalendarEvents(); // Refresh calendar
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to create reservation');
      }
    });
  }
  
  closeModal(): void {
    this.showReservationModal = false;
    this.selectedSlot = null;
  }
  
  getResourceTypeLabel(type: ResourceType): string {
    switch (type) {
      case ResourceType.CLASSROOM: return 'Classroom';
      case ResourceType.LABORATORY: return 'Laboratory';
      case ResourceType.COLLABORATIVE_SPACE: return 'Collaborative Space';
      case ResourceType.EQUIPMENT: return 'Equipment';
      default: return 'Resource';
    }
  }
}