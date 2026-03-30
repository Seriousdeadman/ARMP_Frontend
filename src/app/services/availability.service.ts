// frontend/src/app/services/availability.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ResourceType } from '../models/resource.models';

export interface AvailabilitySlot {
  id: number;
  title: string;
  start: string;
  end: string;
  color: string;
  available: boolean;
  resourceName: string;
  resourceId: number;
}

export interface AvailabilityRequest {
  resourceType: ResourceType;
  resourceId: number;
  start: string;
  end: string;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private apiUrl = `${environment.apiUrl}/api/availability`;

  constructor(private http: HttpClient) {}

  getResourceAvailability(request: AvailabilityRequest): Observable<AvailabilitySlot[]> {
    return this.http.post<AvailabilitySlot[]>(`${this.apiUrl}/resource`, request);
  }

  checkAvailability(
    type: ResourceType,
    resourceId: number,
    start: string,
    end: string
  ): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check`, {
      params: {
        type: type,
        resourceId: resourceId.toString(),
        start: start,
        end: end
      }
    });
  }

  getAvailableDaySlots(
    type: ResourceType,
    resourceId: number,
    date: string
  ): Observable<AvailabilitySlot[]> {
    return this.http.get<AvailabilitySlot[]>(`${this.apiUrl}/day-slots`, {
      params: {
        type: type,
        resourceId: resourceId.toString(),
        date: date
      }
    });
  }
}