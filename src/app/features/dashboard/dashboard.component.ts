import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { UserStatistics, Session, User } from '../../models/user.models';
import {
  Classroom,
  CollaborativeSpace,
  Equipment,
  Laboratory,
  ResourceStatus
} from '../../models/resource.models';
import { AuthService } from '../../services/auth.service';

export interface DashboardResourceStats {
  totalEquipment: number;
  totalClassrooms: number;
  totalLaboratories: number;
  totalCollaborativeSpaces: number;
  totalRoomLocations: number;
  availableResourcesAll: number;
  unavailableResourcesAll: number;
  occupiedRooms: number;
  availableRooms: number;
  availableEquipment: number;
  unavailableEquipment: number;
  totalSeatingCapacity: number;
  totalResourceRecords: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  currentUser: User | null = null;
  stats: UserStatistics | null = null;
  recentSessions: Session[] = [];
  isLoading = true;

  resourceStats: DashboardResourceStats | null = null;
  resourceStatsLoading = true;
  readonly ResourceStatus = ResourceStatus;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStats();
    this.loadRecentSessions();
    this.loadResourceStats();
  }

  loadStats(): void {
    this.http.get<UserStatistics>(
      `${environment.apiUrl}/api/profile/stats`
    ).subscribe({
      next: (s) => this.stats = s,
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  loadRecentSessions(): void {
    this.http.get<Session[]>(
      `${environment.apiUrl}/api/profile/sessions`
    ).subscribe({
      next: (sessions) => {
        this.recentSessions = sessions.slice(0, 5);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load sessions', err);
        this.isLoading = false;
      }
    });
  }

  loadResourceStats(): void {
    this.resourceStatsLoading = true;
    forkJoin({
      classrooms: this.http.get<Classroom[]>(`${environment.apiUrl}/api/classrooms`),
      laboratories: this.http.get<Laboratory[]>(`${environment.apiUrl}/api/laboratories`),
      spaces: this.http.get<CollaborativeSpace[]>(`${environment.apiUrl}/api/collaborative-spaces`),
      equipment: this.http.get<Equipment[]>(`${environment.apiUrl}/api/equipment`)
    }).subscribe({
      next: ({ classrooms, laboratories, spaces, equipment }) => {
        this.resourceStats = this.buildResourceStats(
          classrooms,
          laboratories,
          spaces,
          equipment
        );
        this.resourceStatsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load resource stats', err);
        this.resourceStatsLoading = false;
        this.resourceStats = null;
      }
    });
  }

  private buildResourceStats(
    classrooms: Classroom[],
    laboratories: Laboratory[],
    spaces: CollaborativeSpace[],
    equipment: Equipment[]
  ): DashboardResourceStats {
    const roomLike = [...classrooms, ...laboratories, ...spaces];
    const allResources = [...roomLike, ...equipment];

    const availableResourcesAll = allResources.filter(
      r => r.status === ResourceStatus.AVAILABLE
    ).length;
    const unavailableResourcesAll = allResources.filter(
      r => r.status === ResourceStatus.UNAVAILABLE
    ).length;

    const occupiedRooms = roomLike.filter(
      r => r.status === ResourceStatus.UNAVAILABLE
    ).length;
    const availableRooms = roomLike.filter(
      r => r.status === ResourceStatus.AVAILABLE
    ).length;

    const availableEquipment = equipment.filter(
      e => e.status === ResourceStatus.AVAILABLE
    ).length;
    const unavailableEquipment = equipment.filter(
      e => e.status === ResourceStatus.UNAVAILABLE
    ).length;

    const totalSeatingCapacity = roomLike.reduce((sum, r) => sum + (r.capacity || 0), 0);

    return {
      totalEquipment: equipment.length,
      totalClassrooms: classrooms.length,
      totalLaboratories: laboratories.length,
      totalCollaborativeSpaces: spaces.length,
      totalRoomLocations: roomLike.length,
      availableResourcesAll,
      unavailableResourcesAll,
      occupiedRooms,
      availableRooms,
      availableEquipment,
      unavailableEquipment,
      totalSeatingCapacity,
      totalResourceRecords: allResources.length
    };
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
}
