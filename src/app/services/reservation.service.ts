// frontend/src/app/services/reservation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ReservationRequest, ReservationResponse, ResourceType } from '../models/resource.models';

export interface ConflictAlternative {
  id: number;
  name: string;
  resourceType: ResourceType;
  capacity?: number;
  building?: string;
  roomNumber?: string;
  startDatetime: string;
  endDatetime: string;
  score: number;
  reason: string;
  changeType: string;
  shiftDescription?: string;
}

export interface SmartBookingResponse {
  reservation?: ReservationResponse;
  alternatives?: ConflictAlternative[];
  conflict?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReservationService {

  private apiUrl = `${environment.apiUrl}/api/reservations`;

  constructor(private http: HttpClient) {}

  create(request: ReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(this.apiUrl, request);
  }

  getMyReservations(): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.apiUrl}/my`);
  }

  cancel(id: number): Observable<ReservationResponse> {
    return this.http.put<ReservationResponse>(`${this.apiUrl}/${id}/cancel`, {});
  }

  getByResource(type: string, id: number): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.apiUrl}/resource/${type}/${id}`);
  }

  smartBook(request: ReservationRequest): Observable<SmartBookingResponse> {
    console.log('Smart booking request:', request);
    
    return this.http.post<any>(`${this.apiUrl}/smart-book`, request).pipe(
      map(response => {
        console.log('Smart booking response:', response);
        if (response.id) {
          return { reservation: response, conflict: false };
        }
        return { alternatives: response, conflict: true };
      }),
      catchError(async (error) => {
        console.log('Smart booking error:', error);
        if (error.status === 409) {
          return { alternatives: error.error, conflict: true };
        }
        throw error;
      })
    );
  }

  resolveConflict(request: any): Observable<ConflictAlternative[]> {
    return this.http.post<ConflictAlternative[]>(`${this.apiUrl}/resolve-conflict`, request);
  }
}