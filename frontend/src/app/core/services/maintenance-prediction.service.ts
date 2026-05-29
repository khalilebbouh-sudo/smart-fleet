import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MaintenancePrediction } from '../models/maintenance-prediction.model';

@Injectable({ providedIn: 'root' })
export class MaintenancePredictionService {
  constructor(private api: ApiService) {}

  getAll(): Observable<{ data: MaintenancePrediction[] }> {
    return this.api.get<{ data: MaintenancePrediction[] }>('/predictions/maintenance');
  }

  refresh(vehicleId: number): Observable<{ data: MaintenancePrediction }> {
    return this.api.post<{ data: MaintenancePrediction }>(`/predictions/maintenance/${vehicleId}/refresh`, {});
  }

  getHistory(vehicleId: number, page = 1): Observable<{ data: MaintenancePrediction[] }> {
    return this.api.get<{ data: MaintenancePrediction[] }>(`/predictions/maintenance/${vehicleId}/history`, { page });
  }
}
