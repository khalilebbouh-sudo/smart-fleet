import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import Chart from 'chart.js/auto';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TndCurrencyPipe } from '../../core/pipes/tnd-currency.pipe';

interface DashboardData {
  total_vehicles: number;
  vehicles_under_maintenance: number;
  active_drivers: number;
  fuel: { total_liters: number; total_cost: number };
  series: {
    vehicles_by_status: Array<{ status: string; count: number }>;
    fuel_by_month: Array<{ ym: string; liters: number; cost: number }>;
    maintenance_by_month: Array<{ ym: string; count: number; cost: number }>;
  };
}

type AlertLevel = 'medium' | 'critical' | 'info';
interface AlertItem {
  type: string;
  level: AlertLevel;
  title: string;
  message: string;
  created_at: string;
  vehicle: { id: number; brand: string; model: string; license_plate: string; mileage: number; status: string };
}
interface AlertsResponse { count: number; alerts: AlertItem[]; }

interface VehicleRow {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  mileage: number;
  status: string;
}
interface MaintenanceRow {
  id: number;
  maintenance_type: string;
  date: string;
  cost: string;
  vehicle?: { id: number; brand: string; model: string; license_plate: string };
}
interface FuelRow {
  id: number;
  liters: string;
  price: string;
  date: string;
  vehicle?: { id: number; brand: string; model: string; license_plate: string };
}
interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink, TndCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="saas">
      <div class="topbar">
        <div>
          <div class="eyebrow">Smart Fleet</div>
          <h1 class="title">{{ auth.isAdmin() ? ('DASHBOARD.ADMIN_TITLE' | translate) : ('DASHBOARD.USER_TITLE' | translate) }}</h1>
        </div>
        <div class="top-actions">
          <a class="ghost" routerLink="/alerts">
            <span class="icon">⚠️</span>
            <span>{{ 'NAV.ALERTS' | translate }}</span>
            @if (alertsCount() > 0) { <span class="pill">{{ alertsCount() }}</span> }
          </a>
        </div>
      </div>

      @if (loading) {
        <div class="skeleton-grid">
          @for (i of [1,2,3,4]; track i) { <div class="sk-card"></div> }
        </div>
      } @else if (data) {
        <!-- KPI cards -->
        <div class="kpi-grid">
              <div class="kpi kpi-blue">
            <div class="kpi-head">
              <div class="kpi-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 16l-1-4 2-6h12l2 6-1 4" />
                  <path d="M7 16a2 2 0 0 0 4 0" />
                  <path d="M13 16a2 2 0 0 0 4 0" />
                  <path d="M6 12h12" />
                </svg>
              </div>
              <div class="kpi-meta">
                <div class="kpi-label">{{ 'DASHBOARD.TOTAL_VEHICLES' | translate }}</div>
                <div class="kpi-sub">{{ vehiclesKpiSubtitle() }}</div>
              </div>
            </div>
            <div class="kpi-value">{{ data.total_vehicles }}</div>
          </div>

          <div class="kpi kpi-orange">
            <div class="kpi-head">
              <div class="kpi-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M14.7 6.3a1 1 0 0 0-1.4 0l-7.1 7.1a2 2 0 0 0-.5 1.9l.3 1.1 1.1.3a2 2 0 0 0 1.9-.5l7.1-7.1a1 1 0 0 0 0-1.4Z" />
                  <path d="M15 7l2-2" />
                  <path d="M19 11l2-2" />
                  <path d="M13 9l2 2" />
                </svg>
              </div>
              <div class="kpi-meta">
                <div class="kpi-label">{{ 'DASHBOARD.MAINTENANCE_DUE' | translate }}</div>
                <div class="kpi-sub">{{ maintenanceDueKpiSubtitle() }}</div>
              </div>
            </div>
            <div class="kpi-value">{{ maintenanceDueCount() }}</div>
          </div>

          <div class="kpi kpi-green">
            <div class="kpi-head">
              <div class="kpi-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 22h18" />
                  <path d="M7 22V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
                  <path d="M9 10h6" />
                </svg>
              </div>
              <div class="kpi-meta">
                <div class="kpi-label">{{ 'DASHBOARD.FUEL_CONSUMPTION' | translate }}</div>
                <div class="kpi-sub">{{ fuelKpiSubtitle() }}</div>
              </div>
            </div>
            <div class="kpi-value">{{ fuelThisMonth() | number:'1.0-0' }} L</div>
          </div>

          <div class="kpi kpi-red">
            <div class="kpi-head">
              <div class="kpi-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 7h18" />
                  <path d="M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
                  <path d="M7 15h4" />
                </svg>
              </div>
              <div class="kpi-meta">
                <div class="kpi-label">{{ 'DASHBOARD.TOTAL_COST' | translate }}</div>
                <div class="kpi-sub">{{ costKpiSubtitle() }}</div>
              </div>
            </div>
            <div class="kpi-value">{{ totalCostThisMonth() | tnd:0 }}</div>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid-2">
          <div class="card chart-card">
            <div class="card-head">
              <div class="card-title">Fuel consumption</div>
              <div class="card-sub">Last 6 months</div>
            </div>
            <div class="chart">
              <canvas #fuelChart></canvas>
            </div>
          </div>

          <div class="stack">
            <div class="card chart-card">
              <div class="card-head">
                <div class="card-title">Maintenance cost</div>
                <div class="card-sub">Last 6 months</div>
              </div>
              <div class="chart small">
                <canvas #maintenanceChart></canvas>
              </div>
            </div>

            <div class="card chart-card">
              <div class="card-head">
                <div class="card-title">Vehicle status</div>
                <div class="card-sub">Distribution</div>
              </div>
              <div class="chart small">
                <canvas #vehiclesStatusChart></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">Intelligent Alerts</div>
            <div class="card-sub">Maintenance due soon • Fuel anomalies</div>
          </div>
          <div class="alerts">
            @if (alertsLoading()) {
              <div class="alert">
                <div class="alert-icon"><div class="sk-line"></div></div>
                <div class="alert-body">
                  <div class="sk-line" style="width: 55%; height: 12px;"></div>
                  <div class="sk-line" style="margin-top: 10px; width: 92%; height: 10px;"></div>
                  <div class="sk-line" style="margin-top: 8px; width: 60%; height: 10px;"></div>
                </div>
              </div>
            } @else if (alertsError()) {
              <div class="empty">{{ alertsError() }}</div>
            } @else {
              @for (a of dashboardAlerts(); track a.created_at + '-' + a.type + '-' + a.vehicle.id) {
                <div class="alert" [class.critical]="a.level === 'critical'" [class.medium]="a.level === 'medium'">
            <div class="alert-icon">
              @if (a.level === 'critical') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                </svg>
              }
            </div>
                  <div class="alert-body">
                    <div class="alert-title">{{ a.title }}</div>
                    <div class="alert-desc">{{ a.message }}</div>
                    <div class="alert-meta">{{ a.vehicle.license_plate }} — {{ a.vehicle.brand }} {{ a.vehicle.model }}</div>
                  </div>
                </div>
              } @empty {
                <div class="empty">No alerts.</div>
              }
            }
          </div>
        </div>

        <!-- Tables -->
        <div class="grid-3">
          <div class="card">
            <div class="card-head">
              <div class="card-title">Recent vehicles</div>
              <div class="card-sub">Latest registrations</div>
            </div>
            <div class="table">
              <table>
                <thead><tr><th>Plate</th><th>Status</th><th class="num">Mileage</th></tr></thead>
                <tbody>
                  @if (vehiclesLoading()) {
                    @for (i of [1,2,3,4,5]; track i) {
                      <tr>
                        <td><div class="sk-line" style="width: 70%;"></div><div class="sk-line" style="width: 55%; margin-top: 10px;"></div></td>
                        <td><div class="sk-line" style="width: 60%;"></div></td>
                        <td class="num"><div class="sk-line" style="width: 55%; margin-left:auto;"></div></td>
                      </tr>
                    }
                  } @else if (vehiclesError()) {
                    <tr><td colspan="3" class="error-cell">{{ vehiclesError() }}</td></tr>
                  } @else {
                    @for (v of vehiclesRows(); track v.id) {
                      <tr>
                        <td><strong>{{ v.license_plate }}</strong><div class="muted">{{ v.brand }} {{ v.model }}</div></td>
                        <td><span class="badge" [class]="v.status">{{ v.status }}</span></td>
                        <td class="num">{{ v.mileage | number }}</td>
                      </tr>
                    } @empty { <tr><td colspan="3" class="muted">{{ 'COMMON.NO_DATA' | translate }}</td></tr> }
                  }
                </tbody>
              </table>
            </div>
            <div class="pager">
              <button class="ghost" (click)="setVehiclesPage(vehiclesPage()-1)" [disabled]="vehiclesPage()<=1">{{ 'COMMON.PREVIOUS' | translate }}</button>
              <span class="muted">{{ vehiclesPage() }}/{{ vehiclesLastPage() }}</span>
              <button class="ghost" (click)="setVehiclesPage(vehiclesPage()+1)" [disabled]="vehiclesPage()>=vehiclesLastPage()">{{ 'COMMON.NEXT' | translate }}</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <div class="card-title">Recent maintenance</div>
              <div class="card-sub">Work orders & costs</div>
            </div>
            <div class="table">
              <table>
                <thead><tr><th>Vehicle</th><th>Type</th><th class="num">Cost</th></tr></thead>
                <tbody>
                  @if (maintLoading()) {
                    @for (i of [1,2,3,4,5]; track i) {
                      <tr>
                        <td><div class="sk-line" style="width: 68%;"></div><div class="sk-line" style="width: 46%; margin-top: 10px;"></div></td>
                        <td><div class="sk-line" style="width: 62%;"></div></td>
                        <td class="num"><div class="sk-line" style="width: 55%; margin-left:auto;"></div></td>
                      </tr>
                    }
                  } @else if (maintError()) {
                    <tr><td colspan="3" class="error-cell">{{ maintError() }}</td></tr>
                  } @else {
                    @for (m of maintRows(); track m.id) {
                      <tr>
                        <td><strong>{{ m.vehicle?.license_plate ?? '—' }}</strong><div class="muted">{{ m.date | date:'shortDate' }}</div></td>
                        <td>{{ m.maintenance_type }}</td>
                        <td class="num">{{ m.cost | tnd:2 }}</td>
                      </tr>
                    } @empty { <tr><td colspan="3" class="muted">{{ 'COMMON.NO_DATA' | translate }}</td></tr> }
                  }
                </tbody>
              </table>
            </div>
            <div class="pager">
              <button class="ghost" (click)="setMaintPage(maintPage()-1)" [disabled]="maintPage()<=1">{{ 'COMMON.PREVIOUS' | translate }}</button>
              <span class="muted">{{ maintPage() }}/{{ maintLastPage() }}</span>
              <button class="ghost" (click)="setMaintPage(maintPage()+1)" [disabled]="maintPage()>=maintLastPage()">{{ 'COMMON.NEXT' | translate }}</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <div class="card-title">Fuel logs</div>
              <div class="card-sub">Last refuels</div>
            </div>
            <div class="table">
              <table>
                <thead><tr><th>Vehicle</th><th class="num">Liters</th><th class="num">Cost</th></tr></thead>
                <tbody>
                  @if (fuelLoading()) {
                    @for (i of [1,2,3,4,5]; track i) {
                      <tr>
                        <td><div class="sk-line" style="width: 66%;"></div><div class="sk-line" style="width: 48%; margin-top: 10px;"></div></td>
                        <td class="num"><div class="sk-line" style="width: 55%; margin-left:auto;"></div></td>
                        <td class="num"><div class="sk-line" style="width: 55%; margin-left:auto;"></div></td>
                      </tr>
                    }
                  } @else if (fuelError()) {
                    <tr><td colspan="3" class="error-cell">{{ fuelError() }}</td></tr>
                  } @else {
                    @for (r of fuelRows(); track r.id) {
                      <tr>
                        <td><strong>{{ r.vehicle?.license_plate ?? '—' }}</strong><div class="muted">{{ r.date | date:'shortDate' }}</div></td>
                        <td class="num">{{ r.liters | number:'1.0-0' }}</td>
                        <td class="num">{{ r.price | tnd:2 }}</td>
                      </tr>
                    } @empty { <tr><td colspan="3" class="muted">{{ 'COMMON.NO_DATA' | translate }}</td></tr> }
                  }
                </tbody>
              </table>
            </div>
            <div class="pager">
              <button class="ghost" (click)="setFuelPage(fuelPage()-1)" [disabled]="fuelPage()<=1">{{ 'COMMON.PREVIOUS' | translate }}</button>
              <span class="muted">{{ fuelPage() }}/{{ fuelLastPage() }}</span>
              <button class="ghost" (click)="setFuelPage(fuelPage()+1)" [disabled]="fuelPage()>=fuelLastPage()">{{ 'COMMON.NEXT' | translate }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .saas { max-width: 1280px; margin: 0 auto; }
    .topbar { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; margin-bottom: 1rem; }
    .eyebrow { font-size: 0.75rem; letter-spacing: .08em; text-transform: uppercase; color:#6b7280; }
    .title { margin: .15rem 0 0 0; font-size: 1.75rem; font-weight: 700; color:#0f172a; }
    .top-actions { display:flex; gap:.75rem; align-items:center; }
    .ghost { display:inline-flex; align-items:center; gap:.5rem; padding:.55rem .75rem; border:1px solid #e5e7eb; border-radius: 12px; background:#fff; text-decoration:none; color:#0f172a; box-shadow: 0 8px 20px rgba(15,23,42,.06); }
    .ghost:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(15,23,42,.08); }
    .pill { background:#111827; color:#fff; border-radius: 999px; padding:.1rem .45rem; font-size:.75rem; }

    .kpi-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0 1.25rem; }
    @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 620px) { .kpi-grid { grid-template-columns: 1fr; } }
    .kpi { border-radius: 16px; padding: 1rem 1rem .95rem; background: #fff; border: 1px solid rgba(226,232,240,.9); box-shadow: 0 18px 40px rgba(15,23,42,.06); transition: transform .18s ease, box-shadow .18s ease; }
    .kpi:hover { transform: translateY(-3px); box-shadow: 0 22px 46px rgba(15,23,42,.09); }
    .kpi-head { display:flex; align-items:center; gap:.75rem; }
    .kpi-icon { width: 42px; height: 42px; display:grid; place-items:center; border-radius: 14px; font-size: 1.1rem; }
    .kpi-label { font-size:.875rem; font-weight:600; color:#0f172a; }
    .kpi-sub { font-size:.75rem; color:#64748b; margin-top:.1rem; }
    .kpi-value { margin-top:.65rem; font-size: 2.05rem; font-weight: 800; letter-spacing: -0.02em; color:#0f172a; }
    .kpi-blue .kpi-icon { background: rgba(59,130,246,.15); color: #1d4ed8; }
    .kpi-green .kpi-icon { background: rgba(16,185,129,.16); color: #047857; }
    .kpi-orange .kpi-icon { background: rgba(249,115,22,.16); color: #c2410c; }
    .kpi-red .kpi-icon { background: rgba(244,63,94,.14); color: #be123c; }

    .grid-2 { display:grid; grid-template-columns: 1.6fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    @media (max-width: 1000px) { .grid-2 { grid-template-columns: 1fr; } }
    .stack { display:flex; flex-direction: column; gap: 1rem; }

    .card { background:#fff; border: 1px solid rgba(226,232,240,.9); border-radius: 16px; box-shadow: 0 18px 40px rgba(15,23,42,.06); overflow:hidden; }
    .card-head { padding: 1rem 1rem .75rem; display:flex; justify-content:space-between; align-items:flex-end; gap: 1rem; }
    .card-title { font-weight: 700; color:#0f172a; }
    .card-sub { font-size:.8rem; color:#64748b; }
    .chart { padding: 0 1rem 1rem; height: 320px; }
    .chart.small { height: 210px; }

    .alerts { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; padding: 0 1rem 1rem; }
    @media (max-width: 900px) { .alerts { grid-template-columns: 1fr; } }
    .alert { display:flex; gap:.75rem; padding: .85rem; border-radius: 14px; border: 1px solid #e5e7eb; background: #f8fafc; }
    .alert.critical { border-color: rgba(244,63,94,.35); background: rgba(244,63,94,.06); }
    .alert.medium { border-color: rgba(249,115,22,.35); background: rgba(249,115,22,.06); }
    .alert-icon { width: 36px; height: 36px; display:grid; place-items:center; border-radius: 12px; background:#fff; }
    .alert-title { font-weight:700; color:#0f172a; margin-bottom: .1rem; }
    .alert-desc { color:#334155; font-size:.9rem; margin-bottom: .25rem; }
    .alert-meta { color:#64748b; font-size:.8rem; }
    .empty { padding: 0 1rem 1rem; color:#64748b; }

    .grid-3 { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1rem; }
    @media (max-width: 1100px) { .grid-3 { grid-template-columns: 1fr; } }
    .table { padding: 0 1rem .5rem; overflow:auto; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align:left; font-size:.72rem; text-transform: uppercase; letter-spacing: .06em; color:#64748b; padding: .6rem .5rem; border-bottom: 1px solid rgba(226,232,240,.9); }
    td { padding: .7rem .5rem; border-bottom: 1px solid rgba(226,232,240,.7); color:#0f172a; vertical-align: top; }
    tr:hover td { background: rgba(15,23,42,.02); }
    .num { text-align:right; white-space: nowrap; }
    .muted { color:#64748b; font-size: .8rem; }
    .badge { display:inline-flex; align-items:center; padding: .18rem .5rem; border-radius: 999px; font-size: .75rem; border: 1px solid rgba(226,232,240,.9); background:#fff; color:#0f172a; }
    .badge.active { border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.08); color:#047857; }
    .badge.maintenance { border-color: rgba(249,115,22,.35); background: rgba(249,115,22,.08); color:#c2410c; }
    .badge.inactive { border-color: rgba(244,63,94,.35); background: rgba(244,63,94,.08); color:#be123c; }
    .pager { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding: .65rem 1rem 1rem; }

    .skeleton-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 1rem; margin: 1rem 0; }
    .sk-card { height: 122px; border-radius: 16px; background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
    .sk-line { height: 10px; border-radius: 999px; background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
    .error-cell { color: #b42318; font-weight: 600; }
    @keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  data: DashboardData | null = null;
  loading = true;

  @ViewChild('vehiclesStatusChart') vehiclesStatusChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fuelChart') fuelChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('maintenanceChart') maintenanceChart?: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private viewReady = false;

  alerts = signal<AlertItem[]>([]);
  alertsCount = signal(0);
  alertsLoading = signal(false);
  alertsError = signal<string | null>(null);

  vehiclesRows = signal<VehicleRow[]>([]);
  vehiclesLoading = signal(false);
  vehiclesPage = signal(1);
  vehiclesLastPage = signal(1);
  vehiclesError = signal<string | null>(null);

  maintRows = signal<MaintenanceRow[]>([]);
  maintLoading = signal(false);
  maintPage = signal(1);
  maintLastPage = signal(1);
  maintError = signal<string | null>(null);

  fuelRows = signal<FuelRow[]>([]);
  fuelLoading = signal(false);
  fuelPage = signal(1);
  fuelLastPage = signal(1);
  fuelError = signal<string | null>(null);

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private t: TranslateService,
  ) {}

  // KPI subtitles computed from existing data/alerts.
  vehiclesKpiSubtitle = computed(() => this.kpiSubtitle(this.vehiclesDelta()));
  maintenanceDueKpiSubtitle = computed(() => this.kpiSubtitle(this.maintenanceDueDelta()));
  fuelKpiSubtitle = computed(() => this.kpiSubtitle(this.fuelDelta()));
  costKpiSubtitle = computed(() => this.kpiSubtitle(this.costDelta()));

  dashboardAlerts = computed(() => this.alerts().filter((a) => a.level === 'critical' || a.level === 'medium').slice(0, 4));
  maintenanceDueCount = computed(() => this.alerts().filter((a) => a.type === 'maintenance_due').length);
  fuelThisMonth = computed(() => {
    if (!this.data) return 0;
    return this.monthValue(this.data.series.fuel_by_month, 0, 'liters');
  });
  totalCostThisMonth = computed(() => {
    if (!this.data) return 0;
    const fuelCost = this.monthValue(this.data.series.fuel_by_month, 0, 'cost');
    const maintCost = this.monthValue(this.data.series.maintenance_by_month, 0, 'cost');
    return fuelCost + maintCost;
  });

  ngOnInit(): void {
    this.api.get<DashboardData>('/dashboard').subscribe({
      next: (d) => {
        this.data = d;
        // Stop skeleton ASAP for faster perceived load.
        this.loading = false;
        // Charts/tables can finish after the UI is already visible.
        this.renderCharts();
        this.loadTables();
      },
      error: () => (this.loading = false),
    });

    this.alertsLoading.set(true);
    this.alertsError.set(null);
    this.api.get<AlertsResponse>('/alerts').subscribe({
      next: (res) => {
        this.alerts.set(res.alerts ?? []);
        this.alertsCount.set(res.count ?? (res.alerts?.length ?? 0));
        this.alertsLoading.set(false);
      },
      error: () => {
        this.alertsError.set(this.t.instant('ALERTS.FAILED'));
        this.alertsLoading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private destroyCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private renderCharts(): void {
    if (!this.viewReady || !this.data) return;
    if (!this.vehiclesStatusChart?.nativeElement || !this.fuelChart?.nativeElement || !this.maintenanceChart?.nativeElement) {
      return;
    }

    this.destroyCharts();

    const statusLabels = this.data.series.vehicles_by_status.map((s) => s.status);
    const statusCounts = this.data.series.vehicles_by_status.map((s) => s.count);

    const palette = {
      blue: '#2563eb',
      teal: '#14b8a6',
      orange: '#f97316',
      rose: '#f43f5e',
      slate: '#64748b',
    };

    this.charts.push(new Chart(this.vehiclesStatusChart.nativeElement, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusCounts,
          backgroundColor: [palette.blue, palette.orange, palette.rose, palette.teal, palette.slate],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } } },
      },
    }));

    const fuelLabels = this.data.series.fuel_by_month.map((r) => r.ym);
    const fuelLiters = this.data.series.fuel_by_month.map((r) => r.liters);
    const fuelCost = this.data.series.fuel_by_month.map((r) => r.cost);

    this.charts.push(new Chart(this.fuelChart.nativeElement, {
      type: 'line',
      data: {
        labels: fuelLabels,
        datasets: [{
          label: 'Liters',
          data: fuelLiters,
          borderColor: palette.teal,
          backgroundColor: 'rgba(20,184,166,.14)',
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(148,163,184,.25)' }, ticks: { color: '#64748b' } },
        },
      },
    }));

    const maintLabels = this.data.series.maintenance_by_month.map((r) => r.ym);
    const maintCount = this.data.series.maintenance_by_month.map((r) => r.count);
    const maintCost = this.data.series.maintenance_by_month.map((r) => r.cost);

    this.charts.push(new Chart(this.maintenanceChart.nativeElement, {
      type: 'bar',
      data: {
        labels: maintLabels,
        datasets: [{
          label: 'Cost',
          data: maintCost,
          backgroundColor: 'rgba(37,99,235,.20)',
          borderColor: 'rgba(37,99,235,.75)',
          borderWidth: 1,
          borderRadius: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(148,163,184,.25)' }, ticks: { color: '#64748b' } },
        },
      },
    }));
  }

  private monthValue<T extends { ym: string }>(arr: T[], iFromEnd: number, key: keyof T): number {
    const idx = arr.length - 1 - iFromEnd;
    if (idx < 0) return 0;
    const v = arr[idx]?.[key];
    return typeof v === 'number' ? v : Number(v ?? 0);
  }

  private deltaPct(current: number, previous: number): number {
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  vehiclesDelta(): number {
    return 0;
  }

  maintenanceDueDelta(): number {
    // heuristic: compare current due count vs under-maintenance count
    if (!this.data) return 0;
    return this.deltaPct(this.maintenanceDueCount(), this.data.vehicles_under_maintenance || 1);
  }

  fuelDelta(): number {
    if (!this.data) return 0;
    const cur = this.monthValue(this.data.series.fuel_by_month, 0, 'liters');
    const prev = this.monthValue(this.data.series.fuel_by_month, 1, 'liters');
    return this.deltaPct(cur, prev);
  }

  costDelta(): number {
    if (!this.data) return 0;
    const cur = this.totalCostThisMonth();
    const prevFuel = this.monthValue(this.data.series.fuel_by_month, 1, 'cost');
    const prevMaint = this.monthValue(this.data.series.maintenance_by_month, 1, 'cost');
    const prev = prevFuel + prevMaint;
    return this.deltaPct(cur, prev);
  }

  kpiSubtitle(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    const pct = Math.round(delta);
    return `${sign}${pct}% ${this.t.instant('DASHBOARD.THIS_MONTH')}`.trim();
  }

  // --- tables
  private loadTables(): void {
    this.loadVehicles();
    this.loadMaint();
    this.loadFuel();
  }

  private loadVehicles(): void {
    this.vehiclesLoading.set(true);
    this.vehiclesError.set(null);
    this.api.get<Paginated<VehicleRow>>('/vehicles', { page: this.vehiclesPage(), per_page: 5 }).subscribe({
      next: (res) => {
        this.vehiclesRows.set(res.data ?? []);
        this.vehiclesLastPage.set(res.last_page ?? 1);
      },
      error: () => {
        this.vehiclesError.set(this.t.instant('COMMON.FAILED_LOAD'));
        this.vehiclesLoading.set(false);
      },
      complete: () => this.vehiclesLoading.set(false),
    });
  }

  private loadMaint(): void {
    this.maintLoading.set(true);
    this.maintError.set(null);
    this.api.get<Paginated<MaintenanceRow>>('/maintenances', { page: this.maintPage(), per_page: 5 }).subscribe({
      next: (res) => {
        this.maintRows.set(res.data ?? []);
        this.maintLastPage.set(res.last_page ?? 1);
      },
      error: () => {
        this.maintError.set(this.t.instant('COMMON.FAILED_LOAD'));
        this.maintLoading.set(false);
      },
      complete: () => this.maintLoading.set(false),
    });
  }

  private loadFuel(): void {
    this.fuelLoading.set(true);
    this.fuelError.set(null);
    this.api.get<Paginated<FuelRow>>('/fuel-records', { page: this.fuelPage(), per_page: 5 }).subscribe({
      next: (res) => {
        this.fuelRows.set(res.data ?? []);
        this.fuelLastPage.set(res.last_page ?? 1);
      },
      error: () => {
        this.fuelError.set(this.t.instant('COMMON.FAILED_LOAD'));
        this.fuelLoading.set(false);
      },
      complete: () => this.fuelLoading.set(false),
    });
  }

  setVehiclesPage(p: number): void {
    this.vehiclesPage.set(Math.max(1, p));
    this.loadVehicles();
  }
  setMaintPage(p: number): void {
    this.maintPage.set(Math.max(1, p));
    this.loadMaint();
  }
  setFuelPage(p: number): void {
    this.fuelPage.set(Math.max(1, p));
    this.loadFuel();
  }
}
