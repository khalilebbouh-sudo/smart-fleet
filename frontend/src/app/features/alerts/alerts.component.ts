import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type AlertLevel = 'medium' | 'critical' | 'info';

interface AlertItem {
  type: string;
  level: AlertLevel;
  title: string;
  message: string;
  created_at: string;
  vehicle: {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    mileage: number;
    status: string;
  };
  meta?: any;
}

interface AlertsResponse {
  count: number;
  alerts: AlertItem[];
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">{{ 'ALERTS.TITLE' | translate }}</h1>
        <button type="button" class="btn" (click)="load()" [disabled]="loading()">{{ 'ALERTS.REFRESH' | translate }}</button>
      </div>

      <div class="toolbar card">
        <div class="filters">
          <button type="button" class="chip" [class.active]="levelFilter() === 'all'" (click)="levelFilter.set('all')">{{ 'ALERTS.ALL' | translate }}</button>
          <button type="button" class="chip chip-critical" [class.active]="levelFilter() === 'critical'" (click)="levelFilter.set('critical')">{{ 'ALERTS.CRITICAL' | translate }}</button>
          <button type="button" class="chip chip-medium" [class.active]="levelFilter() === 'medium'" (click)="levelFilter.set('medium')">{{ 'ALERTS.MEDIUM' | translate }}</button>
        </div>
        <div class="summary">
          @if (loading()) { <span>Loading…</span> } @else { <span>{{ filtered().length }} alert(s)</span> }
        </div>
      </div>

      <div class="card">
        @if (loading()) {
          <p>Loading…</p>
        } @else if (error()) {
          <p class="error">{{ error() }}</p>
        } @else {
          <div class="list">
            @for (a of filtered(); track a.created_at + '-' + a.type + '-' + a.vehicle.id) {
              <div class="alert-row" [class.critical]="a.level === 'critical'" [class.medium]="a.level === 'medium'">
                <div class="left">
                  <div class="title">
                    <span class="level-badge level-{{ a.level }}">{{ a.level }}</span>
                    <strong>{{ a.title }}</strong>
                  </div>
                  <div class="vehicle">
                    {{ a.vehicle.license_plate }} — {{ a.vehicle.brand }} {{ a.vehicle.model }} • {{ a.vehicle.mileage | number }} km
                  </div>
                  <div class="msg">{{ a.message }}</div>
                </div>
                <div class="right">
                  <div class="time">{{ a.created_at | date:'short' }}</div>
                </div>
              </div>
            } @empty {
              <p>{{ 'ALERTS.EMPTY' | translate }}</p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .filters { display: flex; gap: 0.5rem; align-items: center; }
    .chip {
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      font-size: 0.8125rem;
    }
    .chip.active { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
    .chip-critical { border-color: #f85149; }
    .chip-medium { border-color: #d29922; }
    .summary { color: #666; font-size: 0.875rem; }
    .list { display: flex; flex-direction: column; gap: 0.75rem; }
    .alert-row {
      border: 1px solid #eee;
      border-radius: 10px;
      padding: 0.9rem 1rem;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      background: #fff;
    }
    .alert-row.critical { border-color: rgba(248,81,73,0.35); background: rgba(248,81,73,0.06); }
    .alert-row.medium { border-color: rgba(210,153,34,0.35); background: rgba(210,153,34,0.06); }
    .title { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .vehicle { color: #555; font-size: 0.875rem; margin-bottom: 0.25rem; }
    .msg { color: #333; }
    .time { color: #777; font-size: 0.8125rem; text-align: right; white-space: nowrap; }
    .level-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .level-critical { background: rgba(248,81,73,0.18); color: #b42318; }
    .level-medium { background: rgba(210,153,34,0.18); color: #8a5a00; }
    .level-info { background: rgba(30,58,95,0.12); color: #1e3a5f; }
    .error { color: #b42318; }
  `],
})
export class AlertsComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  alerts = signal<AlertItem[]>([]);
  levelFilter = signal<'all' | 'critical' | 'medium'>('all');

  filtered = computed(() => {
    const f = this.levelFilter();
    const list = this.alerts();
    if (f === 'all') return list;
    return list.filter((a) => a.level === f);
  });

  constructor(
    private api: ApiService,
    private t: TranslateService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.get<AlertsResponse>('/alerts').subscribe({
      next: (res) => this.alerts.set(res.alerts ?? []),
      error: () => this.error.set(this.t.instant('ALERTS.FAILED')),
      complete: () => this.loading.set(false),
    });
  }
}

