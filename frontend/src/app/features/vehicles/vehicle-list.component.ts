import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  mileage: number;
  status: string;
  photo_url?: string | null;
  driver?: { id: number; name: string } | null;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule],
  template: `
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">{{ 'VEHICLES.TITLE' | translate }}</h1>
        @if (auth.isAdmin()) {
          <a routerLink="/vehicles/new" class="btn btn-primary">{{ 'VEHICLES.ADD' | translate }}</a>
        }
      </div>
      <div class="toolbar card">
        <input type="text" class="search-input" [placeholder]="'VEHICLES.SEARCH_PLACEHOLDER' | translate" [(ngModel)]="search" (ngModelChange)="load()" />
        <select class="status-select" [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">{{ 'VEHICLES.ALL_STATUSES' | translate }}</option>
          <option value="active">{{ 'VEHICLES.STATUS_ACTIVE' | translate }}</option>
          <option value="maintenance">{{ 'VEHICLES.STATUS_MAINTENANCE' | translate }}</option>
          <option value="inactive">{{ 'VEHICLES.STATUS_INACTIVE' | translate }}</option>
        </select>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 52px;">Photo</th>
                <th>{{ 'VEHICLES.PLATE' | translate }}</th>
                <th>{{ 'VEHICLES.BRAND_MODEL' | translate }}</th>
                <th>{{ 'VEHICLES.YEAR' | translate }}</th>
                <th>{{ 'VEHICLES.MILEAGE' | translate }}</th>
                <th>{{ 'VEHICLES.STATUS' | translate }}</th>
                <th>{{ 'VEHICLES.DRIVER' | translate }}</th>
                @if (auth.isAdmin()) { <th></th> }
              </tr>
            </thead>
            <tbody>
              @if (loading) {
                <tr><td colspan="7">{{ 'COMMON.LOADING' | translate }}</td></tr>
              } @else {
                @for (v of vehicles(); track v.id) {
                  <tr>
                    <td class="photo-cell">
                      <div class="avatar" [class.has-photo]="!!v.photo_url">
                        @if (v.photo_url) {
                          <img [src]="v.photo_url" alt="" />
                        } @else {
                          <span>{{ v.license_plate.slice(0, 1).toUpperCase() }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <strong>{{ v.license_plate }}</strong>
                    </td>
                    <td>{{ v.brand }} {{ v.model }}</td>
                    <td>{{ v.year }}</td>
                    <td>{{ v.mileage | number }}</td>
                    <td><span class="badge badge-{{ v.status }}">{{ v.status }}</span></td>
                    <td>{{ v.driver?.name ?? '—' }}</td>
                    @if (auth.isAdmin()) {
                      <td>
                        <a [routerLink]="['/vehicles', v.id, 'edit']" class="btn btn-sm">{{ 'COMMON.EDIT' | translate }}</a>
                        <button type="button" class="btn btn-sm btn-danger" (click)="delete(v)">{{ 'COMMON.DELETE' | translate }}</button>
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr><td colspan="7">{{ 'VEHICLES.NO_RESULTS' | translate }}</td></tr>
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
    .toolbar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .search-input { flex: 1; min-width: 200px; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-primary); color: var(--text-primary); }
    .status-select { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-primary); color: var(--text-primary); }
    .btn-sm { padding: 0.35rem 0.6rem; font-size: 0.8125rem; margin-right: 0.5rem; }
    .pagination { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .photo-cell { width: 52px; }
    .avatar { width: 30px; height: 30px; border-radius: 10px; border: 1px solid var(--border); background: #fff; display:grid; place-items:center; overflow:hidden; color: #0f766e; font-weight: 700; font-size: .85rem; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; display:block; }
  `],
})
export class VehicleListComponent implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  loading = false;
  page = signal(1);
  lastPage = signal(1);
  search = '';
  statusFilter = '';
  private raw = signal<Paginated<Vehicle> | null>(null);

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private t: TranslateService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.page() };
    if (this.search) params['search'] = this.search;
    if (this.statusFilter) params['status'] = this.statusFilter;
    this.api.get<Paginated<Vehicle>>('/vehicles', params).subscribe({
      next: (res) => {
        this.raw.set(res);
        this.vehicles.set(res.data);
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

  delete(v: Vehicle): void {
    if (!confirm(this.t.instant('VEHICLES.CONFIRM_DELETE', { plate: v.license_plate }))) return;
    this.api.delete(`/vehicles/${v.id}`).subscribe({ next: () => this.load() });
  }
}
