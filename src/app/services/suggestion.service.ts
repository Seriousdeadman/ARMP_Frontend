// frontend/src/app/services/suggestion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ResourceSuggestionRequest, ResourceSuggestionResponse } from '../models/resource.models';

@Injectable({ providedIn: 'root' })
export class SuggestionService {
  private apiUrl = `${environment.apiUrl}/api/suggestions`;

  constructor(private http: HttpClient) {}

  suggestResources(request: ResourceSuggestionRequest): Observable<ResourceSuggestionResponse[]> {
    return this.http.post<ResourceSuggestionResponse[]>(`${this.apiUrl}/resources`, request);
  }
}