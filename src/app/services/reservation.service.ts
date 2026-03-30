import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ReservationRequest, ReservationResponse } from '../models/resource.models';

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
}