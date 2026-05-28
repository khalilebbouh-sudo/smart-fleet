import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface Driver {
  id: number;
  name: string;
  phone: string | null;
  license_number: string | null;
  address: string | null;
  photo_url?: string | null;
  vehicle?: { id: number; brand: string; model: string; license_plate: string } | null;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule],
  template: `
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">{{ 'DRIVERS.TITLE' | translate }}</h1>
        <a routerLink="/drivers/new" class="btn btn-primary">{{ 'DRIVERS.ADD' | translate }}</a>
      </div>
      <div class="toolbar card">
        <input type="text" class="search-input" [placeholder]="'DRIVERS.SEARCH_PLACEHOLDER' | translate" [(ngModel)]="search" (ngModelChange)="load()" />
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 52px;">Photo</th>
                <th>{{ 'DRIVERS.NAME' | translate }}</th>
                <th>{{ 'DRIVERS.PHONE' | translate }}</th>
                <th>{{ 'DRIVERS.LICENSE' | translate }}</th>
                <th>{{ 'DRIVERS.ASSIGNED_VEHICLE' | translate }}</th>
                <th>{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @if (loading) {
                <tr><td colspan="6">{{ 'COMMON.LOADING' | translate }}</td></tr>
              } @else {
                @for (d of drivers(); track d.id) {
                  <tr>
                    <td class="photo-cell">
                      <div class="avatar" [class.has-photo]="!!d.photo_url">
                        @if (d.photo_url) {
                          <img [src]="d.photo_url" alt="" />
                        } @else {
                          <span>{{ d.name.slice(0, 1).toUpperCase() }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <strong>{{ d.name }}</strong>
                    </td>
                    <td>{{ d.phone ?? '—' }}</td>
                    <td>{{ d.license_number ?? '—' }}</td>
                    <td>{{ d.vehicle ? d.vehicle.brand + ' ' + d.vehicle.model + ' (' + d.vehicle.license_plate + ')' : '—' }}</td>
                    <td>
                      <a [routerLink]="['/drivers', d.id, 'edit']" class="btn btn-sm">{{ 'COMMON.EDIT' | translate }}</a>
                      @if (isAdmin()) {
                        <button type="button" class="btn btn-sm btn-danger" (click)="delete(d)">{{ 'COMMON.DELETE' | translate }}</button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6">{{ 'DRIVERS.NO_RESULTS' | translate }}</td></tr>
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
    .search-input { width: 100%; max-width: 320px; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-primary); color: var(--text-primary); }
    .btn-sm { padding: 0.35rem 0.6rem; font-size: 0.8125rem; margin-right: 0.5rem; }
    .pagination { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .photo-cell { width: 52px; }
    .avatar { width: 30px; height: 30px; border-radius: 999px; border: 1px solid var(--border); background: #fff; display:grid; place-items:center; overflow:hidden; color: #0f766e; font-weight: 700; font-size: .85rem; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; display:block; }
  `],
})
export class DriverListComponent implements OnInit {
  drivers = signal<Driver[]>([]);
  loading = false;
  page = signal(1);
  lastPage = signal(1);
  search = '';

  /** Suppression conducteur : API réservée à l’admin */
  isAdmin = () => this.auth.currentUser()?.role === 'admin';

  constructor(
    private api: ApiService,
    private t: TranslateService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.page() };
    if (this.search) params['search'] = this.search;
    this.api.get<Paginated<Driver>>('/drivers', params).subscribe({
      next: (res) => {
        this.drivers.set(res.data);
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

  delete(d: Driver): void {
    if (!confirm(this.t.instant('DRIVERS.CONFIRM_DELETE', { name: d.name }))) return;
    this.api.delete(`/drivers/${d.id}`).subscribe({ next: () => this.load() });
  }
}
