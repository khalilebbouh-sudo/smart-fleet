import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TndCurrencyPipe } from '../../core/pipes/tnd-currency.pipe';

interface Maintenance {
  id: number;
  vehicle_id: number;
  maintenance_type: string;
  description: string | null;
  date: string;
  cost: string;
  vehicle?: { id: number; brand: string; model: string; license_plate: string };
}

interface Paginated<T> {
  data: T[];
  last_page: number;
}

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule, TndCurrencyPipe],
  template: `
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">{{ 'MAINTENANCE.TITLE' | translate }}</h1>
        <a routerLink="/maintenances/new" class="btn btn-primary">{{ 'MAINTENANCE.ADD' | translate }}</a>
      </div>
      <div class="toolbar card">
        <select class="vehicle-select" [(ngModel)]="vehicleId" (ngModelChange)="load()">
          <option value="">{{ 'COMMON.ALL_VEHICLES' | translate }}</option>
          @for (v of vehicles; track v.id) {
            <option [value]="v.id">{{ v.license_plate }} – {{ v.brand }} {{ v.model }}</option>
          }
        </select>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ 'MAINTENANCE.DATE' | translate }}</th>
                <th>{{ 'MAINTENANCE.TYPE' | translate }}</th>
                <th>{{ 'MAINTENANCE.VEHICLE' | translate }}</th>
                <th>{{ 'MAINTENANCE.COST' | translate }}</th>
                @if (auth.isAdmin()) { <th></th> }
              </tr>
            </thead>
            <tbody>
              @if (loading) {
                <tr><td colspan="5">{{ 'COMMON.LOADING' | translate }}</td></tr>
              } @else {
                @for (m of maintenances(); track m.id) {
                  <tr>
                    <td>{{ m.date | date:'shortDate' }}</td>
                    <td>{{ m.maintenance_type }}</td>
                    <td>{{ m.vehicle ? m.vehicle.brand + ' ' + m.vehicle.model + ' (' + m.vehicle.license_plate + ')' : '—' }}</td>
                    <td>{{ m.cost | tnd:2 }}</td>
                    @if (auth.isAdmin()) {
                      <td>
                        <a [routerLink]="['/maintenances', m.id, 'edit']" class="btn btn-sm">{{ 'COMMON.EDIT' | translate }}</a>
                        <button type="button" class="btn btn-sm btn-danger" (click)="delete(m)">{{ 'COMMON.DELETE' | translate }}</button>
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr><td [attr.colspan]="auth.isAdmin() ? 5 : 4">{{ 'MAINTENANCE.NO_RESULTS' | translate }}</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (lastPage() > 1) {
          <div class="pagination">
            <button type="button" class="btn" [disabled]="page() <= 1" (click)="setPage(page() - 1)">{{ 'COMMON.PREVIOUS' | translate }}</button>
            <span>{{ 'COMMON.PAGE_OF' | translate:{ page: page(), total: lastPage() } }}</span>
            <button type="button" class="btn" [disabled]="page() >= lastPage()" (click)="setPage(page() + 1)">{{ 'COMMON.NEXT' | translate }}</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .toolbar { margin-bottom: 1rem; }
    .vehicle-select { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-primary); color: var(--text-primary); min-width: 220px; }
    .btn-sm { padding: 0.35rem 0.6rem; font-size: 0.8125rem; margin-right: 0.5rem; }
    .pagination { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
  `],
})
export class MaintenanceListComponent implements OnInit {
  maintenances = signal<Maintenance[]>([]);
  vehicles: { id: number; brand: string; model: string; license_plate: string }[] = [];
  loading = false;
  page = signal(1);
  lastPage = signal(1);
  vehicleId = '';

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private t: TranslateService,
  ) {}

  ngOnInit(): void {
    this.api.get<{ data: any[] }>('/vehicles', { per_page: 500 }).subscribe({
      next: (res: any) => this.vehicles = res.data || res,
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.page() };
    if (this.vehicleId) params['vehicle_id'] = this.vehicleId;
    this.api.get<Paginated<Maintenance>>('/maintenances', params).subscribe({
      next: (res) => {
        this.maintenances.set(res.data);
        this.lastPage.set(res.last_page);
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  setPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  delete(m: Maintenance): void {
    if (!confirm(this.t.instant('MAINTENANCE.CONFIRM_DELETE'))) return;
    this.api.delete(`/maintenances/${m.id}`).subscribe({ next: () => this.load() });
  }
}
