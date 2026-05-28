import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TndCurrencyPipe } from '../../core/pipes/tnd-currency.pipe';
import { MapWidgetComponent } from './map-widget.component';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';

interface AlertsResponse {
  count: number;
  alerts: Array<{ type?: string }>;
}

interface DashboardPayload {
  total_vehicles: number;
  active_vehicles?: number;
  vehicles_under_maintenance: number;
  missions_today?: number;
  active_drivers: number;
  fuel: { total_liters: number; total_cost: number };
  series: {
    vehicles_by_status: Array<{ status: string; count: number }>;
    fuel_by_month: Array<{ ym: string; liters: number; cost: number }>;
    maintenance_by_month: Array<{ ym: string; count: number; cost: number }>;
    missions_by_month?: Array<{ ym: string; count: number }>;
  };
}

interface FuelRecord {
  id: number;
  vehicle_id: number;
  liters: string | number;
  price: string | number;
  date: string;
  vehicle?: { id: number; brand: string; model: string; license_plate: string };
}

interface TopFuelRow {
  vehicleId: number;
  label: string;
  liters: number;
  cost: number;
}

type MissionRow = {
  id?: number;
  description?: string;
  status?: string;
  created_at?: string;
  vehicle?: { license_plate?: string };
  chauffeur?: { name?: string };
};

type DriverRow = { id?: number; name?: string; email?: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink, TndCurrencyPipe, MapWidgetComponent, NgApexchartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container saas" [class.dash-wide]="canFleet()">
      @if (auth.currentUser()?.role === 'chauffeur') {
        <div class="page-head">
          <div>
            <div class="eyebrow">Smart Fleet</div>
            <h1 class="title">{{ 'DASHBOARD.CHAUFFEUR_TITLE' | translate }}</h1>
            <p class="sub">{{ 'DASHBOARD.CHAUFFEUR_SUBTITLE' | translate }}</p>
          </div>
        </div>

        @if (chauffeurLoading()) {
          <div class="skeleton-grid">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="sk-card"></div>
            }
          </div>
        } @else if (chauffeurError()) {
          <div class="chauffeur-error">{{ chauffeurError() }}</div>
        } @else {
          <section class="glass note">
            <div class="note-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </div>
            <div>
              <div class="note-title">{{ 'DASHBOARD.CHAUFFEUR_EMAIL_INFO_TITLE' | translate }}</div>
              <div class="note-text">
                @if (auth.currentUser()?.mail_delivery === 'live') {
                  {{ 'DASHBOARD.CHAUFFEUR_EMAIL_INFO_LIVE' | translate:{ email: auth.currentUser()?.email ?? '' } }}
                } @else {
                  {{ 'DASHBOARD.CHAUFFEUR_EMAIL_INFO_SANDBOX' | translate:{ email: auth.currentUser()?.email ?? '' } }}
                }
              </div>
            </div>
          </section>

          <div class="kpi-row">
            <div class="kpi-card grad-a">
              <div class="kpi-top">
                <div class="kpi-name">{{ 'DASHBOARD.CHAUFFEUR_MISSIONS_TOTAL' | translate }}</div>
                <span class="kpi-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </span>
              </div>
              <div class="kpi-val">{{ chauffeurStats().total }}</div>
            </div>
            <div class="kpi-card grad-c">
              <div class="kpi-top">
                <div class="kpi-name">{{ 'MISSIONS.PLANNED' | translate }}</div>
                <span class="kpi-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18v18H3z"/><path d="M7 8h10"/><path d="M7 12h6"/><path d="M7 16h10"/></svg>
                </span>
              </div>
              <div class="kpi-val">{{ chauffeurStats().planned }}</div>
            </div>
            <div class="kpi-card grad-b">
              <div class="kpi-top">
                <div class="kpi-name">{{ 'MISSIONS.IN_PROGRESS' | translate }}</div>
                <span class="kpi-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                </span>
              </div>
              <div class="kpi-val">{{ chauffeurStats().inProgress }}</div>
            </div>
            <div class="kpi-card grad-d">
              <div class="kpi-top">
                <div class="kpi-name">{{ 'MISSIONS.COMPLETED' | translate }}</div>
                <span class="kpi-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
              </div>
              <div class="kpi-val">{{ chauffeurStats().completed }}</div>
            </div>
          </div>

          <div class="quick-row">
            <a class="quick" routerLink="/my-missions">
              <span class="q-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
              <div>
                <div class="q-title">{{ 'NAV.MY_MISSIONS' | translate }}</div>
                <div class="q-sub">{{ 'DASHBOARD.CHAUFFEUR_LINK_MISSIONS' | translate }}</div>
              </div>
            </a>
            <a class="quick" routerLink="/trajets">
              <span class="q-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 6h5l1 2h12"/><path d="M5 16l-1-5h16l-1 5"/><path d="M7 18h.01"/><path d="M17 18h.01"/></svg></span>
              <div>
                <div class="q-title">{{ 'NAV.TRAJETS' | translate }}</div>
                <div class="q-sub">{{ 'DASHBOARD.CHAUFFEUR_LINK_TRAJETS' | translate }}</div>
              </div>
            </a>
            <a class="quick" routerLink="/incidents/report">
              <span class="q-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
              <div>
                <div class="q-title">{{ 'NAV.REPORT_INCIDENT' | translate }}</div>
                <div class="q-sub">{{ 'DASHBOARD.CHAUFFEUR_LINK_INCIDENT' | translate }}</div>
              </div>
            </a>
            <a class="quick" routerLink="/incidents">
              <span class="q-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
              <div>
                <div class="q-title">{{ 'NAV.INCIDENTS' | translate }}</div>
                <div class="q-sub">{{ 'DASHBOARD.CHAUFFEUR_LINK_LIST' | translate }}</div>
              </div>
            </a>
          </div>
        }
      } @else {
        <div class="premium-grid">
          <div class="main-col">
            <div class="page-head">
              <div>
                <div class="eyebrow">Smart Fleet</div>
                <h1 class="title">{{
                  auth.isAdmin()
                    ? ('DASHBOARD.ADMIN_TITLE' | translate)
                    : ('DASHBOARD.USER_TITLE' | translate)
                }}</h1>
                <p class="sub">{{ 'DASHBOARD.ANALYTICS_INTRO' | translate }}</p>
              </div>
              <div class="head-actions">
                @if (canFleet()) {
                  <a class="pill-btn" routerLink="/alerts">
                    <span class="p-ic" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                    </span>
                    <span>{{ 'NAV.ALERTS' | translate }}</span>
                    @if (alertsCount() > 0) {
                      <span class="p-badge">{{ alertsCount() }}</span>
                    }
                  </a>
                }
              </div>
            </div>

            @if (dashLoading()) {
              <div class="skeleton-dash">
                <div class="sk-row kpi-sk"></div>
                @if (canFleet()) {
                  <div class="sk-row hero-sk"></div>
                }
                <div class="sk-row charts-sk"></div>
              </div>
            } @else if (dashError()) {
              <div class="dash-err">{{ dashError() }}</div>
            } @else {
              <div class="kpi-row kpi-6">
                <div class="kpi-card grad-a">
                  <div class="kpi-top">
                    <div class="kpi-name">{{ 'DASHBOARD.TOTAL_VEHICLES' | translate }}</div>
                    <span class="kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 16l1-4 2-6h12l2 6 1 4"/><path d="M6 12h12"/><path d="M7 16a2 2 0 0 0 4 0"/><path d="M13 16a2 2 0 0 0 4 0"/></svg></span>
                  </div>
                  <div class="kpi-val">{{ dashboard()?.total_vehicles ?? 0 }}</div>
                  <div class="kpi-foot">
                    <span class="trend up">{{ driverCoverPct() | number:'1.1-1' }}%</span>
                    <span class="muted">{{ 'DASHBOARD.INSIGHT_DRIVER_COVER' | translate }}</span>
                  </div>
                  <apx-chart class="spark" [chart]="sparkChartCfg" [series]="sparkVehiclesSeries()" [stroke]="sparkStrokeCfg" [grid]="sparkGridCfg" [fill]="sparkFillA" [colors]="sparkColorsA" [tooltip]="sparkTooltipCfg" [xaxis]="sparkXAxisCfg" [yaxis]="sparkYAxisCfg" [dataLabels]="sparkDataLabelsCfg"></apx-chart>
                </div>

                <div class="kpi-card grad-b">
                  <div class="kpi-top">
                    <div class="kpi-name">{{ 'DASHBOARD.ACTIVE_VEHICLES' | translate }}</div>
                    <span class="kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 12l5 5L20 7"/></svg></span>
                  </div>
                  <div class="kpi-val">{{ dashboard()?.active_vehicles ?? 0 }}</div>
                  <div class="kpi-foot">
                    <span class="trend ok">{{ activeFleetPct() | number:'1.1-1' }}%</span>
                    <span class="muted">{{ 'DASHBOARD.TREND_FLEET_SHARE' | translate }}</span>
                  </div>
                  <apx-chart class="spark" [chart]="sparkChartCfg" [series]="sparkActiveVehiclesSeries()" [stroke]="sparkStrokeCfg" [grid]="sparkGridCfg" [fill]="sparkFillB" [colors]="sparkColorsB" [tooltip]="sparkTooltipCfg" [xaxis]="sparkXAxisCfg" [yaxis]="sparkYAxisCfg" [dataLabels]="sparkDataLabelsCfg"></apx-chart>
                </div>

                <div class="kpi-card grad-d">
                  <div class="kpi-top">
                    <div class="kpi-name">{{ 'DASHBOARD.MISSIONS_TODAY' | translate }}</div>
                    <span class="kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
                  </div>
                  <div class="kpi-val">{{ dashboard()?.missions_today ?? 0 }}</div>
                  <div class="kpi-foot">
                    <span class="trend" [class.up]="(missionsMomPct() ?? 0) >= 0" [class.bad]="(missionsMomPct() ?? 0) < 0">{{ missionsMomPct() === null ? '—' : (missionsMomPct()! > 0 ? '+' : '') + (missionsMomPct() | number:'1.1-1') + '%' }}</span>
                    <span class="muted">{{ 'DASHBOARD.TREND_MOM' | translate }}</span>
                  </div>
                  <apx-chart class="spark" [chart]="sparkChartCfg" [series]="sparkMissionsMonthSeries()" [stroke]="sparkStrokeCfg" [grid]="sparkGridCfg" [fill]="sparkFillD" [colors]="sparkColorsD" [tooltip]="sparkTooltipCfg" [xaxis]="sparkXAxisCfg" [yaxis]="sparkYAxisCfg" [dataLabels]="sparkDataLabelsCfg"></apx-chart>
                </div>

                <div class="kpi-card grad-teal">
                  <div class="kpi-top">
                    <div class="kpi-name">{{ 'DASHBOARD.FUEL_LITERS' | translate }}</div>
                    <span class="kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 22h10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z"/><path d="M7 9h2"/><path d="M13 13h2a2 2 0 0 0 2-2V6l-2-2"/></svg></span>
                  </div>
                  <div class="kpi-val">{{ (dashboard()?.fuel?.total_liters ?? 0) | number:'1.0-0' }} <span class="unit">L</span></div>
                  <div class="kpi-foot">
                    <span class="trend up">{{ fuelMomPct() === null ? '—' : (fuelMomPct()! > 0 ? '+' : '') + (fuelMomPct() | number:'1.1-1') + '%' }}</span>
                    <span class="muted">{{ 'DASHBOARD.TREND_MOM' | translate }}</span>
                  </div>
                  <apx-chart class="spark" [chart]="sparkChartCfg" [series]="sparkFuelSeries()" [stroke]="sparkStrokeCfg" [grid]="sparkGridCfg" [fill]="sparkFillTeal" [colors]="sparkColorsTeal" [tooltip]="sparkTooltipCfg" [xaxis]="sparkXAxisCfg" [yaxis]="sparkYAxisCfg" [dataLabels]="sparkDataLabelsCfg"></apx-chart>
                </div>

                <div class="kpi-card grad-danger">
                  <div class="kpi-top">
                    <div class="kpi-name">{{ 'NAV.ALERTS' | translate }}</div>
                    <span class="kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
                  </div>
                  <div class="kpi-val">{{ alertsCount() }}</div>
                  <div class="kpi-foot">
                    <span class="trend bad">{{ 'DASHBOARD.TREND_LIVE' | translate }}</span>
                    <span class="muted">{{ 'DASHBOARD.OPEN_ALERTS' | translate }}</span>
                  </div>
                  <apx-chart class="spark" [chart]="sparkChartCfg" [series]="sparkAlertsSeries()" [stroke]="sparkStrokeCfg" [grid]="sparkGridCfg" [fill]="sparkFillDanger" [colors]="sparkColorsDanger" [tooltip]="sparkTooltipCfg" [xaxis]="sparkXAxisCfg" [yaxis]="sparkYAxisCfg" [dataLabels]="sparkDataLabelsCfg"></apx-chart>
                </div>

                <div class="kpi-card grad-c">
                  <div class="kpi-top">
                    <div class="kpi-name">{{ 'DASHBOARD.UNDER_MAINTENANCE' | translate }}</div>
                    <span class="kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14.7 6.3a1 1 0 0 0-1.4 0l-7.1 7.1a2 2 0 0 0-.5 1.9l.3 1.1 1.1.3a2 2 0 0 0 1.9-.5l7.1-7.1a1 1 0 0 0 0-1.4Z"/><path d="M15 7l2-2"/><path d="M19 11l2-2"/></svg></span>
                  </div>
                  <div class="kpi-val">{{ dashboard()?.vehicles_under_maintenance ?? 0 }}</div>
                  <div class="kpi-foot">
                    <span class="trend warn">{{ maintSharePct() | number:'1.1-1' }}%</span>
                    <span class="muted">{{ 'DASHBOARD.TREND_FLEET_SHARE' | translate }}</span>
                  </div>
                  <apx-chart class="spark" [chart]="sparkChartCfg" [series]="sparkMaintSeries()" [stroke]="sparkStrokeCfg" [grid]="sparkGridCfg" [fill]="sparkFillC" [colors]="sparkColorsC" [tooltip]="sparkTooltipCfg" [xaxis]="sparkXAxisCfg" [yaxis]="sparkYAxisCfg" [dataLabels]="sparkDataLabelsCfg"></apx-chart>
                </div>
              </div>

              @if (canFleet()) {
                <section class="hero glass">
                  <div class="hero-head">
                    <div class="hero-title">
                      <span class="hero-dot" aria-hidden="true"></span>
                      <span>{{ 'DASHBOARD.LIVE_MAP_TITLE' | translate }}</span>
                      <span class="live-pill">LIVE</span>
                    </div>
                    <div class="hero-actions">
                      <a class="mini" routerLink="/fleet/live">{{ 'NAV.FLEET_LIVE' | translate }}</a>
                      <a class="mini ghost" routerLink="/missions">{{ 'NAV.MISSIONS' | translate }}</a>
                    </div>
                  </div>
                  <div class="hero-body">
                    <app-map-widget />
                    <div class="hero-overlay">
                      <div class="ov-title">{{ 'DASHBOARD.LIVE_MAP_TITLE' | translate }}</div>
                      <div class="ov-sub">{{ 'DASHBOARD.LIVE_MAP_SUB' | translate }}</div>
                      <div class="ov-stats">
                        <div class="ov-k">
                          <div class="ov-l">{{ 'DASHBOARD.OVERLAY_FLEET' | translate }}</div>
                          <div class="ov-v">{{ dashboard()?.total_vehicles ?? 0 }}</div>
                        </div>
                        <div class="ov-k">
                          <div class="ov-l">{{ 'DASHBOARD.OVERLAY_DRIVERS' | translate }}</div>
                          <div class="ov-v">{{ dashboard()?.active_drivers ?? 0 }}</div>
                        </div>
                        <div class="ov-k">
                          <div class="ov-l">{{ 'DASHBOARD.OVERLAY_ALERTS' | translate }}</div>
                          <div class="ov-v">{{ alertsCount() }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              }

              @defer (on idle) {
                <div class="bottom-grid">
                  <section class="glass card">
                    <div class="card-head">
                      <div class="card-title">{{ 'DASHBOARD.CHART_FUEL_TITLE' | translate }}</div>
                      <div class="card-sub">{{ 'DASHBOARD.FUEL_CONSUMPTION' | translate }}</div>
                    </div>
                    <apx-chart
                      [chart]="fuelChart().chart"
                      [series]="fuelChart().series"
                      [xaxis]="fuelChart().xaxis"
                      [yaxis]="fuelChart().yaxis"
                      [grid]="fuelChart().grid"
                      [stroke]="fuelChart().stroke"
                      [fill]="fuelChart().fill"
                      [colors]="fuelChart().colors"
                      [tooltip]="fuelChart().tooltip"
                      [legend]="fuelChart().legend"
                      [dataLabels]="fuelChart().dataLabels"
                    ></apx-chart>
                  </section>

                  <section class="glass card">
                    <div class="card-head">
                      <div class="card-title">{{ 'DASHBOARD.CHART_MAINT_TITLE' | translate }}</div>
                      <div class="card-sub">{{ 'DASHBOARD.RECENT_MAINTENANCE' | translate }}</div>
                    </div>
                    <apx-chart
                      [chart]="maintChart().chart"
                      [series]="maintChart().series"
                      [xaxis]="maintChart().xaxis"
                      [yaxis]="maintChart().yaxis"
                      [grid]="maintChart().grid"
                      [stroke]="maintChart().stroke"
                      [fill]="maintChart().fill"
                      [colors]="maintChart().colors"
                      [tooltip]="maintChart().tooltip"
                      [legend]="maintChart().legend"
                      [dataLabels]="maintChart().dataLabels"
                      [plotOptions]="maintChart().plotOptions"
                    ></apx-chart>
                  </section>

                  <section class="glass card">
                    <div class="card-head">
                      <div class="card-title">{{ 'DASHBOARD.CHART_STATUS_TITLE' | translate }}</div>
                      <div class="card-sub">{{ 'DASHBOARD.SMART_INSIGHTS' | translate }}</div>
                    </div>
                    <apx-chart
                      [chart]="statusDonut().chart"
                      [series]="statusDonut().series"
                      [labels]="statusDonut().labels"
                      [legend]="statusDonut().legend"
                      [dataLabels]="statusDonut().dataLabels"
                      [plotOptions]="statusDonut().plotOptions"
                      [stroke]="statusDonut().stroke"
                      [fill]="statusDonut().fill"
                      [colors]="statusDonut().colors"
                      [tooltip]="statusDonut().tooltip"
                    ></apx-chart>
                  </section>
                </div>

                <div class="bottom-grid bottom-grid-2">
                  <section class="glass card">
                    <div class="card-head">
                      <div class="card-title">{{ 'DASHBOARD.CHART_MISSIONS_TITLE' | translate }}</div>
                      <div class="card-sub">{{ 'DASHBOARD.TREND_MOM' | translate }}</div>
                    </div>
                    <apx-chart
                      [chart]="missionsChart().chart"
                      [series]="missionsChart().series"
                      [xaxis]="missionsChart().xaxis"
                      [yaxis]="missionsChart().yaxis"
                      [grid]="missionsChart().grid"
                      [stroke]="missionsChart().stroke"
                      [fill]="missionsChart().fill"
                      [colors]="missionsChart().colors"
                      [tooltip]="missionsChart().tooltip"
                      [legend]="missionsChart().legend"
                      [dataLabels]="missionsChart().dataLabels"
                    ></apx-chart>
                  </section>

                  <section class="glass card">
                    <div class="card-head">
                      <div class="card-title">{{ 'DASHBOARD.CHART_ALERTS_TITLE' | translate }}</div>
                      <div class="card-sub">{{ 'DASHBOARD.OPEN_ALERTS' | translate }}</div>
                    </div>
                    @if (alertsTypeRows().length > 0) {
                      <apx-chart
                        [chart]="alertsBarChart().chart"
                        [series]="alertsBarChart().series"
                        [xaxis]="alertsBarChart().xaxis"
                        [yaxis]="alertsBarChart().yaxis"
                        [grid]="alertsBarChart().grid"
                        [stroke]="alertsBarChart().stroke"
                        [fill]="alertsBarChart().fill"
                        [colors]="alertsBarChart().colors"
                        [tooltip]="alertsBarChart().tooltip"
                        [legend]="alertsBarChart().legend"
                        [dataLabels]="alertsBarChart().dataLabels"
                        [plotOptions]="alertsBarChart().plotOptions"
                      ></apx-chart>
                    } @else {
                      <div class="chart-empty">{{ 'ALERTS.EMPTY' | translate }}</div>
                    }
                  </section>

                  <section class="glass card health-card">
                    <div class="card-head">
                      <div class="card-title">{{ 'DASHBOARD.SYSTEM_HEALTH_TITLE' | translate }}</div>
                      <div class="card-sub">{{ 'DASHBOARD.SYSTEM_HEALTH_SUB' | translate }}</div>
                    </div>
                    <div class="health-grid">
                      <div class="health-tile">
                        <div class="h-l">{{ 'DASHBOARD.SYSTEM_HEALTH_UPTIME' | translate }}</div>
                        <div class="h-v">99.9%</div>
                        <div class="h-bar"><span class="h-fill ok" style="width:99%"></span></div>
                      </div>
                      <div class="health-tile">
                        <div class="h-l">{{ 'DASHBOARD.SYSTEM_HEALTH_LATENCY' | translate }}</div>
                        <div class="h-v">~30s</div>
                        <div class="h-bar"><span class="h-fill mid" style="width:40%"></span></div>
                      </div>
                      <div class="health-tile span-2">
                        <div class="h-l">{{ 'DASHBOARD.ACTIVE_DRIVERS' | translate }}</div>
                        <div class="h-v">{{ dashboard()?.active_drivers ?? 0 }} / {{ dashboard()?.total_vehicles ?? 0 }}</div>
                        <div class="h-note">{{ 'DASHBOARD.INSIGHT_DRIVER_COVER' | translate }}</div>
                      </div>
                    </div>
                  </section>
                </div>
              } @placeholder {
                <div class="chart-defer-ph bottom-grid" aria-hidden="true">
                  <div class="ph-card"></div>
                  <div class="ph-card"></div>
                  <div class="ph-card"></div>
                </div>
                <div class="chart-defer-ph bottom-grid bottom-grid-2" aria-hidden="true">
                  <div class="ph-card"></div>
                  <div class="ph-card"></div>
                  <div class="ph-card"></div>
                </div>
              }
            }
          </div>

          <aside class="right-col">
            <section class="glass panel">
              <div class="panel-head">
                <div class="panel-title">{{ 'DASHBOARD.PANEL_ONLINE_DRIVERS' | translate }}</div>
                @if (canFleet()) {
                  <a class="panel-link" routerLink="/drivers">{{ 'DASHBOARD.VIEW_ALL' | translate }}</a>
                }
              </div>
              @if (sideLoading()) {
                <div class="mini-skel"></div>
              } @else {
                <div class="list">
                  @for (d of onlineDrivers(); track driverRowKey(d)) {
                    <div class="row">
                      <div class="ava" aria-hidden="true">{{ (d.name ?? 'D').charAt(0).toUpperCase() }}</div>
                      <div class="row-meta">
                        <div class="row-title">{{ d.name ?? '—' }}</div>
                        <div class="row-sub">{{ d.email ?? '—' }}</div>
                      </div>
                      <div class="row-pill ok">ONLINE</div>
                    </div>
                  }
                  @if (onlineDrivers().length === 0) {
                    <div class="empty">{{ 'COMMON.NO_DATA' | translate }}</div>
                  }
                </div>
              }
            </section>

            <section class="glass panel">
              <div class="panel-head">
                <div class="panel-title">{{ 'DASHBOARD.PANEL_RECENT_MISSIONS' | translate }}</div>
                @if (canFleet()) {
                  <a class="panel-link" routerLink="/missions">{{ 'DASHBOARD.VIEW_ALL' | translate }}</a>
                }
              </div>
              @if (sideLoading()) {
                <div class="mini-skel"></div>
              } @else {
                <div class="list">
                  @for (m of recentMissions(); track missionRowKey(m)) {
                    <div class="row">
                      <div class="ava alt" aria-hidden="true">#</div>
                      <div class="row-meta">
                        <div class="row-title">{{ m.vehicle?.license_plate ?? ('MISSIONS.NAME' | translate) }} {{ m.id ? ('#' + m.id) : '' }}</div>
                        <div class="row-sub">{{ (m.description ?? m.status ?? '—') }}</div>
                      </div>
                      <div class="row-pill" [class.ok]="m.status === 'in_progress'" [class.warn]="m.status === 'planned'" [class.bad]="m.status === 'completed'">
                        {{ m.status ?? '—' }}
                      </div>
                    </div>
                  }
                  @if (recentMissions().length === 0) {
                    <div class="empty">{{ 'COMMON.NO_DATA' | translate }}</div>
                  }
                </div>
              }
            </section>

            @if (canFleet()) {
              <section class="glass panel">
                <div class="panel-head">
                  <div class="panel-title">{{ 'DASHBOARD.TOP_FUEL_VEHICLES' | translate }}</div>
                  <a class="panel-link" routerLink="/fuel">{{ 'NAV.FUEL' | translate }}</a>
                </div>
                @if (topFuelVehicles().length === 0) {
                  <div class="empty">{{ 'FUEL.NO_RESULTS' | translate }}</div>
                } @else {
                  <div class="fuel-list">
                    @for (r of topFuelVehicles(); track r.vehicleId) {
                      <div class="fuel-row">
                        <div class="fuel-label">{{ r.label }}</div>
                        <div class="fuel-metrics">
                          <span class="m">{{ r.liters | number:'1.1-1' }} L</span>
                          <span class="m strong">{{ r.cost | tnd:2 }}</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </section>
            }
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .saas {
      --stroke: rgba(148, 163, 184, 0.16);
      --text: rgba(226, 232, 240, 0.96);
      margin: 0;
      padding: 0;
      min-width: 0;
      width: 100%;
      overflow-x: hidden;
      color: var(--text);
    }
    .dash-wide { max-width: none !important; }
    .glass {
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      border: 1px solid var(--stroke);
      border-radius: 18px;
      box-shadow: 0 26px 90px rgba(0,0,0,.42);
      backdrop-filter: blur(10px);
    }
    .page-head { display:flex; align-items:flex-end; justify-content: space-between; gap: 1rem; margin: .2rem 0 1.05rem; }
    .eyebrow { font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; color: rgba(148,163,184,.82); }
    .title { margin: .2rem 0 0; font-size: 1.9rem; font-weight: 950; letter-spacing: -.02em; color: rgba(226,232,240,.96); }
    .sub { margin: .55rem 0 0; color: rgba(148,163,184,.86); max-width: 60rem; line-height: 1.45; }
    .head-actions { display:flex; align-items:center; gap: .7rem; }
    .pill-btn {
      display:inline-flex; align-items:center; gap: .55rem;
      height: 40px;
      padding: 0 .8rem;
      border-radius: 14px;
      border: 1px solid rgba(56,189,248,.22);
      background: linear-gradient(135deg, rgba(56,189,248,.18), rgba(59,130,246,.10));
      color: rgba(226,232,240,.94);
      text-decoration:none;
      font-weight: 900;
      box-shadow: 0 18px 56px rgba(56,189,248,.08);
      transition: transform .14s ease, border-color .14s ease, box-shadow .14s ease;
    }
    .pill-btn:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.45); box-shadow: 0 22px 64px rgba(56,189,248,.12); }
    .p-ic { width: 18px; height: 18px; display:inline-grid; place-items:center; color: rgba(56,189,248,.95); }
    .p-ic svg { width: 18px; height: 18px; }
    .p-badge {
      margin-left: .15rem;
      height: 18px;
      min-width: 18px;
      padding: 0 6px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 950;
      background: radial-gradient(circle at 30% 30%, rgba(56,189,248,.95), rgba(59,130,246,.95));
      color: #020617;
      display:grid; place-items:center;
      box-shadow: 0 10px 28px rgba(56,189,248,.25);
    }
    .premium-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.05rem; align-items: start; }
    @media (min-width: 1200px) { .premium-grid { grid-template-columns: minmax(0, 1fr) 380px; } }
    .main-col { min-width: 0; }
    .right-col { min-width: 0; display:flex; flex-direction: column; gap: 1rem; }
    .kpi-row { display:grid; gap: .9rem; margin-bottom: 1rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    @media (max-width: 900px) { .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 520px) { .kpi-row { grid-template-columns: 1fr; } }
    .kpi-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    @media (max-width: 1300px) { .kpi-6 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 760px) { .kpi-6 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 520px) { .kpi-6 { grid-template-columns: 1fr; } }
    .kpi-card {
      position: relative;
      overflow: hidden;
      padding: .9rem .95rem .85rem;
      border-radius: 18px;
      border: 1px solid rgba(148,163,184,.16);
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      box-shadow: 0 26px 90px rgba(0,0,0,.42);
      backdrop-filter: blur(10px);
      transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
      min-width: 0;
    }
    .kpi-card:before {
      content: "";
      position: absolute;
      inset: -2px;
      background: radial-gradient(420px 140px at 15% 0%, rgba(56,189,248,.26), transparent 60%);
      opacity: .9;
      pointer-events: none;
    }
    .kpi-card:hover { transform: translateY(-2px); border-color: rgba(56,189,248,.22); box-shadow: 0 32px 110px rgba(0,0,0,.52); }
    .grad-a:before { background: radial-gradient(420px 140px at 15% 0%, rgba(56,189,248,.26), transparent 60%); }
    .grad-b:before { background: radial-gradient(420px 140px at 15% 0%, rgba(34,197,94,.18), transparent 60%); }
    .grad-c:before { background: radial-gradient(420px 140px at 15% 0%, rgba(251,191,36,.16), transparent 60%); }
    .grad-d:before { background: radial-gradient(420px 140px at 15% 0%, rgba(99,102,241,.18), transparent 60%); }
    .grad-teal:before { background: radial-gradient(420px 140px at 15% 0%, rgba(20,184,166,.18), transparent 60%); }
    .grad-danger:before { background: radial-gradient(420px 140px at 15% 0%, rgba(251,113,133,.18), transparent 60%); }
    .grad-navy:before { background: radial-gradient(420px 140px at 15% 0%, rgba(59,130,246,.16), transparent 60%); }
    .kpi-top { position: relative; display:flex; align-items:flex-start; justify-content: space-between; gap: .6rem; }
    .kpi-name { font-size: .76rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: rgba(148,163,184,.86); }
    .kpi-ic { width: 36px; height: 36px; border-radius: 14px; display:grid; place-items:center; border: 1px solid rgba(148,163,184,.16); background: rgba(255,255,255,.03); color: rgba(226,232,240,.92); box-shadow: 0 18px 48px rgba(0,0,0,.38); }
    .kpi-ic svg { width: 18px; height: 18px; }
    .kpi-val { position: relative; margin-top: .55rem; font-size: 1.6rem; font-weight: 950; letter-spacing: -.03em; color: rgba(226,232,240,.98); min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .unit { font-size: .92rem; font-weight: 900; color: rgba(148,163,184,.86); margin-left: .15rem; }
    .kpi-foot { position: relative; margin-top: .25rem; display:flex; align-items:center; gap: .5rem; font-size: .82rem; }
    .trend { font-weight: 950; padding: .12rem .45rem; border-radius: 999px; border: 1px solid rgba(148,163,184,.16); background: rgba(255,255,255,.03); }
    .trend.up { color: rgba(56,189,248,.95); border-color: rgba(56,189,248,.18); }
    .trend.ok { color: rgba(34,197,94,.95); border-color: rgba(34,197,94,.18); }
    .trend.warn { color: rgba(251,191,36,.95); border-color: rgba(251,191,36,.18); }
    .trend.bad { color: rgba(251,113,133,.95); border-color: rgba(251,113,133,.18); }
    .muted { color: rgba(148,163,184,.86); }
    .spark { position: relative; margin-top: .2rem; height: 54px; }
    :host ::ng-deep .apexcharts-tooltip { background: rgba(2,6,23,.88) !important; border: 1px solid rgba(148,163,184,.18) !important; color: rgba(226,232,240,.95) !important; box-shadow: 0 20px 60px rgba(0,0,0,.55) !important; }
    :host ::ng-deep .apexcharts-tooltip-title { background: rgba(2,6,23,.88) !important; border-bottom: 1px solid rgba(148,163,184,.14) !important; color: rgba(226,232,240,.92) !important; }
    :host ::ng-deep .apexcharts-legend-text { color: rgba(148,163,184,.90) !important; }
    .hero { margin-bottom: 1rem; }
    .hero-head { display:flex; align-items:center; justify-content: space-between; gap: 1rem; padding: .8rem .9rem .7rem; border-bottom: 1px solid rgba(148,163,184,.10); }
    .hero-title { display:flex; align-items:center; gap: .6rem; font-weight: 950; color: rgba(226,232,240,.96); letter-spacing: -.01em; }
    .hero-dot { width: 10px; height: 10px; border-radius: 999px; background: rgba(34,197,94,.95); box-shadow: 0 0 0 6px rgba(34,197,94,.08), 0 0 30px rgba(34,197,94,.25); }
    .live-pill { margin-left: .35rem; font-size: 11px; font-weight: 950; letter-spacing: .16em; padding: .18rem .5rem; border-radius: 999px; border: 1px solid rgba(34,197,94,.20); color: rgba(34,197,94,.95); background: rgba(34,197,94,.06); }
    .hero-actions { display:flex; gap: .55rem; align-items:center; }
    .mini { height: 36px; padding: 0 .75rem; border-radius: 14px; border: 1px solid rgba(56,189,248,.22); background: rgba(56,189,248,.10); color: rgba(226,232,240,.94); text-decoration:none; font-weight: 900; display:inline-flex; align-items:center; transition: transform .14s ease, border-color .14s ease; }
    .mini.ghost { border-color: rgba(148,163,184,.16); background: rgba(255,255,255,.03); color: rgba(226,232,240,.92); }
    .mini:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.45); }
    .hero-body { position: relative; height: 470px; padding: .85rem; }
    .hero-body app-map-widget { display:block; height: 100%; }
    .hero-overlay {
      position: absolute; left: 1.25rem; top: 1.2rem;
      width: min(360px, calc(100% - 2.5rem));
      padding: .85rem .9rem;
      border-radius: 18px;
      border: 1px solid rgba(148,163,184,.16);
      background: rgba(2, 6, 23, 0.52);
      backdrop-filter: blur(10px);
      box-shadow: 0 26px 90px rgba(0,0,0,.55);
    }
    .ov-title { font-weight: 950; color: rgba(226,232,240,.96); }
    .ov-sub { margin-top: .15rem; font-size: .82rem; color: rgba(148,163,184,.86); }
    .ov-stats { margin-top: .75rem; display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
    .ov-k { padding: .55rem .6rem; border-radius: 14px; border: 1px solid rgba(148,163,184,.12); background: rgba(255,255,255,.03); }
    .ov-l { font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; color: rgba(148,163,184,.82); font-weight: 900; }
    .ov-v { margin-top: .25rem; font-size: 1.05rem; font-weight: 950; color: rgba(226,232,240,.98); }
    .bottom-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .9rem; }
    .bottom-grid-2 { margin-top: .9rem; }
    @media (max-width: 1100px) { .bottom-grid, .bottom-grid-2 { grid-template-columns: 1fr; } }
    .chart-defer-ph { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .9rem; margin-top: 0; }
    @media (max-width: 1100px) { .chart-defer-ph { grid-template-columns: 1fr; } }
    .chart-defer-ph .ph-card { min-height: 260px; border-radius: 18px; border: 1px solid rgba(148,163,184,.10); background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.05), rgba(255,255,255,.03)); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
    .chart-empty { min-height: 200px; display:grid; place-items:center; padding: 1rem; border-radius: 14px; border: 1px dashed rgba(148,163,184,.2); color: rgba(148,163,184,.88); font-weight: 700; }
    .health-card .health-grid { display:grid; grid-template-columns: 1fr 1fr; gap: .65rem; margin-top: .25rem; }
    .health-tile { padding: .65rem .7rem; border-radius: 14px; border: 1px solid rgba(148,163,184,.12); background: rgba(255,255,255,.03); }
    .health-tile.span-2 { grid-column: 1 / -1; }
    .h-l { font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 900; color: rgba(148,163,184,.82); }
    .h-v { margin-top: .25rem; font-size: 1.25rem; font-weight: 950; color: rgba(226,232,240,.98); }
    .h-note { margin-top: .35rem; font-size: .78rem; color: rgba(148,163,184,.86); line-height: 1.35; }
    .h-bar { margin-top: .45rem; height: 6px; border-radius: 999px; background: rgba(2,6,23,.45); overflow: hidden; }
    .h-fill { display:block; height:100%; border-radius: 999px; }
    .h-fill.ok { background: linear-gradient(90deg, #22c55e, #38bdf8); }
    .h-fill.mid { background: linear-gradient(90deg, #fbbf24, #fb7185); }
    .card { padding: .95rem .95rem .85rem; }
    .card-head { display:flex; align-items:flex-end; justify-content: space-between; gap: .75rem; margin-bottom: .55rem; }
    .card-title { font-weight: 950; color: rgba(226,232,240,.96); }
    .card-sub { font-size: .82rem; color: rgba(148,163,184,.86); }
    .panel { padding: .95rem; }
    .panel-head { display:flex; align-items:flex-end; justify-content: space-between; gap: .75rem; margin-bottom: .65rem; }
    .panel-title { font-weight: 950; color: rgba(226,232,240,.96); }
    .panel-link { font-size: .82rem; font-weight: 900; color: rgba(56,189,248,.95); text-decoration: none; }
    .panel-link:hover { text-decoration: underline; }
    .mini-skel { height: 160px; border-radius: 16px; border: 1px solid rgba(148,163,184,.10); background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.06), rgba(255,255,255,.03)); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
    .list { display:flex; flex-direction: column; gap: .55rem; }
    .row { display:flex; align-items:center; gap: .65rem; padding: .6rem .6rem; border-radius: 16px; border: 1px solid rgba(148,163,184,.12); background: rgba(255,255,255,.03); }
    .ava { width: 36px; height: 36px; border-radius: 14px; display:grid; place-items:center; font-weight: 950; color: rgba(226,232,240,.95); background: radial-gradient(circle at 30% 30%, rgba(56,189,248,.26), rgba(99,102,241,.12)); border: 1px solid rgba(56,189,248,.18); }
    .ava.alt { background: radial-gradient(circle at 30% 30%, rgba(34,197,94,.20), rgba(56,189,248,.10)); border-color: rgba(34,197,94,.16); }
    .row-meta { min-width: 0; flex: 1; }
    .row-title { font-weight: 950; color: rgba(226,232,240,.96); white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
    .row-sub { margin-top: .12rem; font-size: .82rem; color: rgba(148,163,184,.86); white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
    .row-pill { font-size: 11px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; padding: .3rem .55rem; border-radius: 999px; border: 1px solid rgba(148,163,184,.16); color: rgba(148,163,184,.92); background: rgba(2,6,23,.28); }
    .row-pill.ok { border-color: rgba(34,197,94,.18); color: rgba(34,197,94,.95); background: rgba(34,197,94,.06); }
    .row-pill.warn { border-color: rgba(251,191,36,.18); color: rgba(251,191,36,.95); background: rgba(251,191,36,.06); }
    .row-pill.bad { border-color: rgba(56,189,248,.18); color: rgba(56,189,248,.95); background: rgba(56,189,248,.06); }
    .empty { padding: .65rem .6rem; border-radius: 16px; border: 1px dashed rgba(148,163,184,.18); color: rgba(148,163,184,.86); }
    .fuel-list { display:flex; flex-direction: column; gap: .55rem; }
    .fuel-row { display:flex; align-items:center; justify-content: space-between; gap: .75rem; padding: .6rem .6rem; border-radius: 16px; border: 1px solid rgba(148,163,184,.12); background: rgba(255,255,255,.03); }
    .fuel-label { min-width: 0; font-weight: 900; color: rgba(226,232,240,.96); overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fuel-metrics { display:flex; align-items:center; gap: .55rem; flex-shrink: 0; }
    .m { font-variant-numeric: tabular-nums; color: rgba(148,163,184,.90); font-weight: 900; }
    .m.strong { color: rgba(56,189,248,.95); }
    .note { display:flex; align-items:flex-start; gap: .75rem; padding: .95rem; margin-bottom: 1rem; }
    .note-ic { width: 44px; height: 44px; border-radius: 16px; display:grid; place-items:center; border: 1px solid rgba(56,189,248,.18); background: rgba(56,189,248,.10); color: rgba(56,189,248,.95); flex-shrink: 0; }
    .note-ic svg { width: 22px; height: 22px; }
    .note-title { font-weight: 950; color: rgba(226,232,240,.96); }
    .note-text { margin-top: .18rem; color: rgba(148,163,184,.86); line-height: 1.45; }
    .quick-row { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; margin-top: 1rem; }
    @media (max-width: 720px) { .quick-row { grid-template-columns: 1fr; } }
    .quick { display:flex; gap: .75rem; align-items:flex-start; padding: .95rem; border-radius: 18px; border: 1px solid rgba(148,163,184,.16); background: rgba(255,255,255,.03); box-shadow: 0 26px 90px rgba(0,0,0,.38); text-decoration: none; color: rgba(226,232,240,.96); transition: transform .16s ease, border-color .16s ease; }
    .quick:hover { transform: translateY(-2px); border-color: rgba(56,189,248,.22); }
    .q-ic { width: 44px; height: 44px; border-radius: 16px; display:grid; place-items:center; border: 1px solid rgba(56,189,248,.18); background: rgba(56,189,248,.10); color: rgba(56,189,248,.95); flex-shrink: 0; }
    .q-ic svg { width: 22px; height: 22px; }
    .q-title { font-weight: 950; }
    .q-sub { margin-top: .18rem; font-size: .84rem; color: rgba(148,163,184,.86); line-height: 1.35; }
    .chauffeur-error { padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(220, 38, 38, 0.35); background: rgba(254, 242, 242, 0.9); color: #991b1b; font-weight: 600; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0; }
    @media (max-width: 900px) { .skeleton-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 520px) { .skeleton-grid { grid-template-columns: 1fr; } }
    .sk-card { height: 122px; border-radius: 16px; background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.06), rgba(255,255,255,.03)); background-size: 200% 100%; animation: shimmer 1.3s infinite; border: 1px solid rgba(148,163,184,.10); }
    .skeleton-dash .sk-row { border-radius: 16px; background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.06), rgba(255,255,255,.03)); background-size: 200% 100%; animation: shimmer 1.3s infinite; border: 1px solid rgba(148,163,184,.10); }
    .skeleton-dash .kpi-sk { height: 120px; margin-bottom: 0.85rem; }
    .skeleton-dash .hero-sk { height: 320px; margin-bottom: 0.85rem; }
    .skeleton-dash .charts-sk { height: 260px; }
    .dash-err { padding: 12px 14px; border-radius: 16px; border: 1px solid rgba(251,113,133,.25); background: rgba(251,113,133,.06); color: rgba(226,232,240,.95); font-weight: 900; }
    @keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: -200% 0; } }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  chauffeurLoading = signal(true);
  chauffeurError = signal<string | null>(null);
  chauffeurStats = signal({ total: 0, planned: 0, inProgress: 0, completed: 0 });

  alertsCount = signal(0);
  /** Aggregated alert counts for analytics chart */
  alertsTypeRows = signal<Array<{ type: string; count: number }>>([]);
  dashLoading = signal(false);
  dashError = signal<string | null>(null);
  dashboard = signal<DashboardPayload | null>(null);
  topFuelVehicles = signal<TopFuelRow[]>([]);

  sideLoading = signal(false);
  onlineDrivers = signal<DriverRow[]>([]);
  recentMissions = signal<MissionRow[]>([]);

  /** Stable Apex config objects — avoid new references each CD (prevents chart thrashing). */
  readonly sparkChartCfg: ApexChart = {
    type: 'area',
    height: 54,
    sparkline: { enabled: true },
    animations: { enabled: false },
    redrawOnParentResize: false,
  };
  readonly sparkStrokeCfg: ApexStroke = { curve: 'smooth', width: 2 };
  readonly sparkGridCfg: ApexGrid = { show: false, padding: { left: 0, right: 0, top: 0, bottom: 0 } };
  readonly sparkDataLabelsCfg: ApexDataLabels = { enabled: false };
  readonly sparkTooltipCfg: ApexTooltip = { enabled: true, theme: 'dark', x: { show: false } };
  readonly sparkXAxisCfg: ApexXAxis = {
    labels: { show: false },
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
  };
  readonly sparkYAxisCfg: ApexYAxis = { labels: { show: false } };
  readonly sparkFillA: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 0.2, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] },
  };
  readonly sparkFillB: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 0.2, opacityFrom: 0.28, opacityTo: 0.05, stops: [0, 90, 100] },
  };
  readonly sparkFillC: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 0.2, opacityFrom: 0.28, opacityTo: 0.05, stops: [0, 90, 100] },
  };
  readonly sparkFillTeal: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 0.2, opacityFrom: 0.28, opacityTo: 0.05, stops: [0, 90, 100] },
  };
  readonly sparkFillDanger: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 0.2, opacityFrom: 0.28, opacityTo: 0.05, stops: [0, 90, 100] },
  };
  readonly sparkFillD: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 0.2, opacityFrom: 0.28, opacityTo: 0.05, stops: [0, 90, 100] },
  };
  readonly sparkColorsA = ['#38bdf8'];
  readonly sparkColorsB = ['#22c55e'];
  readonly sparkColorsC = ['#fbbf24'];
  readonly sparkColorsTeal = ['#14b8a6'];
  readonly sparkColorsDanger = ['#fb7185'];
  readonly sparkColorsD = ['#a78bfa'];

  maintSharePct = computed(() => {
    const d = this.dashboard();
    if (!d?.total_vehicles) return 0;
    return (100 * d.vehicles_under_maintenance) / d.total_vehicles;
  });

  fuelMomPct = computed(() => {
    const s = this.dashboard()?.series?.fuel_by_month ?? [];
    if (s.length < 2) return null;
    const a = Number(s[s.length - 2].liters);
    const b = Number(s[s.length - 1].liters);
    if (a <= 0) return b > 0 ? 100 : 0;
    return ((b - a) / a) * 100;
  });

  driverCoverPct = computed(() => {
    const d = this.dashboard();
    if (!d?.total_vehicles) return 0;
    return (100 * d.active_drivers) / d.total_vehicles;
  });

  activeFleetPct = computed(() => {
    const d = this.dashboard();
    if (!d?.total_vehicles) return 0;
    const a = d.active_vehicles ?? 0;
    return (100 * a) / d.total_vehicles;
  });

  missionsMomPct = computed(() => {
    const s = this.dashboard()?.series?.missions_by_month ?? [];
    if (s.length < 2) return null;
    const a = Number(s[s.length - 2].count);
    const b = Number(s[s.length - 1].count);
    if (a <= 0) return b > 0 ? 100 : 0;
    return ((b - a) / a) * 100;
  });

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private t: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.t.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cdr.markForCheck());
    this.t.onDefaultLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cdr.markForCheck());
  }

  ngOnInit(): void {
    if (this.auth.currentUser()?.role === 'chauffeur') {
      this.api
        .get<{ data: Array<{ status: string }> }>('/missions')
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.chauffeurLoading.set(false);
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res) => {
            const list = res.data ?? [];
            let planned = 0;
            let inProgress = 0;
            let completed = 0;
            for (const m of list) {
              if (m.status === 'planned') planned++;
              else if (m.status === 'in_progress') inProgress++;
              else if (m.status === 'completed') completed++;
            }
            this.chauffeurStats.set({ total: list.length, planned, inProgress, completed });
            this.cdr.markForCheck();
          },
          error: () => {
            this.chauffeurError.set(this.t.instant('COMMON.FAILED_LOAD'));
            this.cdr.markForCheck();
          },
        });
      return;
    }

    this.loadDashboard();
  }

  /** Stable @for track keys (avoid recreating list DOM) */
  driverRowKey(d: DriverRow): string | number {
    return d.id ?? d.email ?? d.name ?? '';
  }

  missionRowKey(m: MissionRow): string | number {
    return m.id ?? m.created_at ?? m.description ?? '';
  }

  canFleet(): boolean {
    const r = this.auth.currentUser()?.role;
    return r === 'admin' || r === 'gestionnaire';
  }

  private loadDashboard(): void {
    this.dashLoading.set(true);
    this.dashError.set(null);
    this.api
      .get<DashboardPayload>('/dashboard')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.dashLoading.set(false);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          this.dashboard.set(data);
          this.dashError.set(null);
          this.loadFuel();
          this.loadSidePanel();
          if (this.canFleet()) {
            this.api
              .get<AlertsResponse>('/alerts')
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (res) => {
                  this.alertsCount.set(res.count ?? res.alerts?.length ?? 0);
                  const alerts = res.alerts ?? [];
                  const map = new Map<string, number>();
                  for (const a of alerts) {
                    const t = a.type ?? 'unknown';
                    map.set(t, (map.get(t) ?? 0) + 1);
                  }
                  this.alertsTypeRows.set(
                    [...map.entries()]
                      .map(([type, count]) => ({ type, count }))
                      .sort((a, b) => b.count - a.count),
                  );
                  this.cdr.markForCheck();
                },
                error: () => {
                  this.alertsTypeRows.set([]);
                  this.cdr.markForCheck();
                },
              });
          } else {
            this.alertsCount.set(0);
            this.alertsTypeRows.set([]);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.dashError.set(this.t.instant('COMMON.FAILED_LOAD'));
          this.cdr.markForCheck();
        },
      });
  }

  private loadSidePanel(): void {
    this.sideLoading.set(true);

    if (this.canFleet()) {
      this.api
        .get<{ data: MissionRow[] }>('/missions', { page: 1, per_page: 6 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.recentMissions.set((res?.data ?? []).slice(0, 6));
            this.cdr.markForCheck();
          },
          error: () => {
            this.recentMissions.set([]);
          },
        });

      this.api
        .get<{ data: DriverRow[] }>('/drivers', { page: 1, per_page: 5 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.onlineDrivers.set((res?.data ?? []).slice(0, 5));
            this.sideLoading.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.onlineDrivers.set([]);
            this.sideLoading.set(false);
            this.cdr.markForCheck();
          },
        });
    } else {
      this.recentMissions.set([]);
      this.onlineDrivers.set([]);
      this.sideLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  loadFuel(): void {
    if (!this.canFleet()) {
      this.topFuelVehicles.set([]);
      return;
    }
    this.api
      .get<{ data: FuelRecord[] }>('/fuel-records', { page: 1, per_page: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        const rows = res.data ?? [];
        const acc = new Map<number, { label: string; liters: number; cost: number }>();
        for (const r of rows) {
          const id = r.vehicle_id;
          const label = r.vehicle
            ? `${r.vehicle.brand} ${r.vehicle.model} (${r.vehicle.license_plate})`
            : `#${id}`;
          const L = Number(r.liters);
          const C = Number(r.price);
          const lit = Number.isFinite(L) ? L : 0;
          const cost = Number.isFinite(C) ? C : 0;
          const cur = acc.get(id);
          if (cur) {
            cur.liters += lit;
            cur.cost += cost;
          } else {
            acc.set(id, { label, liters: lit, cost });
          }
        }
        const list = [...acc.entries()]
          .map(([vehicleId, v]) => ({ vehicleId, label: v.label, liters: v.liters, cost: v.cost }))
          .sort((a, b) => b.liters - a.liters)
          .slice(0, 5);
        this.topFuelVehicles.set(list);
        this.cdr.markForCheck();
      },
      error: () => {
        this.topFuelVehicles.set([]);
        this.cdr.markForCheck();
      },
    });
  }

  private statusLabel(status: string): string {
    const key = `VEHICLES.STATUS_${status.toUpperCase()}`;
    const tr = this.t.instant(key);
    return tr !== key ? tr : status;
  }

  private seriesLast6(values: number[]): number[] {
    const v = values.filter((x) => Number.isFinite(x));
    if (v.length >= 6) return v.slice(-6);
    if (v.length === 0) return [3, 4, 3, 5, 4, 6];
    const pad = Array.from({ length: 6 - v.length }, () => v[0]);
    return [...pad, ...v];
  }

  sparkVehiclesSeries = computed<ApexAxisChartSeries>(() => {
    const base = this.dashboard()?.series?.vehicles_by_status?.reduce((a, b) => a + (b.count ?? 0), 0) ?? 0;
    return [{ name: 'Vehicles', data: this.seriesLast6([base * 0.92, base * 0.95, base * 0.93, base * 0.98, base * 1.01, base]) }];
  });
  sparkMaintSeries = computed<ApexAxisChartSeries>(() => {
    const base = this.dashboard()?.vehicles_under_maintenance ?? 0;
    return [{ name: 'Maintenance', data: this.seriesLast6([base * 0.8, base * 0.95, base * 0.9, base * 1.1, base * 1.05, base]) }];
  });
  sparkActiveVehiclesSeries = computed<ApexAxisChartSeries>(() => {
    const rows = this.dashboard()?.series?.vehicles_by_status ?? [];
    const active = rows.find((r) => r.status === 'active')?.count ?? 0;
    return [{ name: 'Active', data: this.seriesLast6([active * 0.92, active * 0.95, active * 0.93, active * 0.98, active * 1.01, active]) }];
  });
  sparkMissionsMonthSeries = computed<ApexAxisChartSeries>(() => {
    const s = this.dashboard()?.series?.missions_by_month ?? [];
    const pts = s.map((x) => Number(x.count));
    return [{ name: 'Missions', data: this.seriesLast6(pts.length ? pts : [0, 0, 0, 0, 0, 0]) }];
  });
  sparkFuelSeries = computed<ApexAxisChartSeries>(() => {
    const s = this.dashboard()?.series?.fuel_by_month ?? [];
    return [{ name: 'Fuel', data: this.seriesLast6(s.map((x) => Number(x.liters))) }];
  });
  sparkAlertsSeries = computed<ApexAxisChartSeries>(() => {
    const a = this.alertsCount();
    return [{ name: 'Alerts', data: this.seriesLast6([a * 0.6, a * 0.8, a * 0.7, a * 1.2, a * 1.05, a]) }];
  });

  fuelChart = computed(() => {
    const s = this.dashboard()?.series?.fuel_by_month ?? [];
    const labels = s.map((x) => x.ym);
    return {
      chart: {
        type: 'area' as const,
        height: 260,
        toolbar: { show: false },
        foreColor: 'rgba(148,163,184,.88)',
        animations: { enabled: false },
        redrawOnParentResize: false,
      },
      series: [
        { name: this.t.instant('DASHBOARD.FUEL_LITERS'), data: s.map((x) => Number(x.liters)) },
        { name: this.t.instant('DASHBOARD.FUEL_COST'), data: s.map((x) => Number(x.cost)) },
      ] as ApexAxisChartSeries,
      colors: ['#38bdf8', '#a78bfa'],
      xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } } as ApexXAxis,
      yaxis: [{ labels: { formatter: (v: number) => `${Math.round(v)}` } }, { opposite: true, labels: { formatter: (v: number) => `${Math.round(v)}` } }] as ApexYAxis[],
      grid: { borderColor: 'rgba(148,163,184,.12)' } as ApexGrid,
      stroke: { curve: 'smooth', width: 2 } as ApexStroke,
      fill: { type: 'gradient', gradient: { opacityFrom: 0.22, opacityTo: 0.04, stops: [0, 90, 100] } } as ApexFill,
      tooltip: { theme: 'dark' } as ApexTooltip,
      legend: { show: true, position: 'top' } as ApexLegend,
      dataLabels: { enabled: false } as ApexDataLabels,
    };
  });

  maintChart = computed(() => {
    const s = this.dashboard()?.series?.maintenance_by_month ?? [];
    const labels = s.map((x) => x.ym);
    return {
      chart: {
        type: 'bar' as const,
        height: 260,
        toolbar: { show: false },
        foreColor: 'rgba(148,163,184,.88)',
        animations: { enabled: false },
        redrawOnParentResize: false,
      },
      series: [
        { name: this.t.instant('DASHBOARD.RECENT_MAINTENANCE'), data: s.map((x) => Number(x.count)) },
        { name: this.t.instant('DASHBOARD.TOTAL_COST'), data: s.map((x) => Number(x.cost)) },
      ] as ApexAxisChartSeries,
      colors: ['#fbbf24', '#60a5fa'],
      xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } } as ApexXAxis,
      yaxis: [{ labels: { formatter: (v: number) => `${Math.round(v)}` } }, { opposite: true, labels: { formatter: (v: number) => `${Math.round(v)}` } }] as ApexYAxis[],
      grid: { borderColor: 'rgba(148,163,184,.12)' } as ApexGrid,
      stroke: { curve: 'smooth', width: 2 } as ApexStroke,
      fill: { opacity: 0.9 } as ApexFill,
      tooltip: { theme: 'dark' } as ApexTooltip,
      legend: { show: true, position: 'top' } as ApexLegend,
      dataLabels: { enabled: false } as ApexDataLabels,
      plotOptions: { bar: { borderRadius: 8, columnWidth: '52%' } } as ApexPlotOptions,
    };
  });

  statusDonut = computed(() => {
    const st = this.dashboard()?.series?.vehicles_by_status ?? [];
    return {
      chart: {
        type: 'donut' as const,
        height: 260,
        toolbar: { show: false },
        foreColor: 'rgba(148,163,184,.88)',
        animations: { enabled: false },
        redrawOnParentResize: false,
      },
      series: st.map((x) => Number(x.count)) as ApexNonAxisChartSeries,
      labels: st.map((x) => this.statusLabel(x.status)),
      colors: ['#22c55e', '#38bdf8', '#fbbf24', '#fb7185', '#94a3b8'],
      legend: { show: true, position: 'bottom' } as ApexLegend,
      dataLabels: { enabled: false } as ApexDataLabels,
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: this.t.instant('DASHBOARD.TOTAL_FLEET'),
                formatter: () => `${this.dashboard()?.total_vehicles ?? 0}`,
              },
            },
          },
        },
      } as ApexPlotOptions,
      stroke: { width: 0 } as ApexStroke,
      fill: { opacity: 1 } as ApexFill,
      tooltip: { theme: 'dark' } as ApexTooltip,
    };
  });

  missionsChart = computed(() => {
    const s = this.dashboard()?.series?.missions_by_month ?? [];
    const labels = s.map((x) => x.ym);
    return {
      chart: {
        type: 'area' as const,
        height: 260,
        toolbar: { show: false },
        foreColor: 'rgba(148,163,184,.88)',
        animations: { enabled: false },
        redrawOnParentResize: false,
      },
      series: [{ name: this.t.instant('DASHBOARD.CHART_MISSIONS_TITLE'), data: s.map((x) => Number(x.count)) }] as ApexAxisChartSeries,
      colors: ['#a78bfa'],
      xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } } as ApexXAxis,
      yaxis: [{ labels: { formatter: (v: number) => `${Math.round(v)}` } }] as ApexYAxis[],
      grid: { borderColor: 'rgba(148,163,184,.12)' } as ApexGrid,
      stroke: { curve: 'smooth', width: 2 } as ApexStroke,
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] } } as ApexFill,
      tooltip: { theme: 'dark' } as ApexTooltip,
      legend: { show: false } as ApexLegend,
      dataLabels: { enabled: false } as ApexDataLabels,
    };
  });

  alertsBarChart = computed(() => {
    const rows = this.alertsTypeRows();
    const labels = rows.map((r) => this.alertTypeLabel(r.type));
    const data = rows.map((r) => r.count);
    return {
      chart: {
        type: 'bar' as const,
        height: 260,
        toolbar: { show: false },
        foreColor: 'rgba(148,163,184,.88)',
        animations: { enabled: false },
        redrawOnParentResize: false,
      },
      series: [{ name: this.t.instant('DASHBOARD.CHART_ALERTS_TITLE'), data }] as ApexAxisChartSeries,
      colors: ['#38bdf8', '#a78bfa', '#fbbf24', '#fb7185', '#22c55e', '#94a3b8'],
      plotOptions: { bar: { horizontal: true, borderRadius: 8, barHeight: '72%', distributed: true } } as ApexPlotOptions,
      xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } } as ApexXAxis,
      yaxis: [{ labels: { formatter: (v: number) => `${Math.round(v)}` } }] as ApexYAxis[],
      grid: { borderColor: 'rgba(148,163,184,.12)' } as ApexGrid,
      stroke: { show: true, width: 0, colors: ['transparent'] } as ApexStroke,
      fill: { opacity: 0.92 } as ApexFill,
      tooltip: { theme: 'dark' } as ApexTooltip,
      legend: { show: false } as ApexLegend,
      dataLabels: { enabled: true, style: { colors: ['#0b1220'], fontWeight: 800, fontSize: '11px' }, formatter: (val: number) => `${val}` } as ApexDataLabels,
    };
  });

  private alertTypeLabel(type: string): string {
    const keys: Record<string, string> = {
      maintenance: 'DASHBOARD.ALERT_TYPE_MAINT',
      maintenance_due: 'DASHBOARD.ALERT_TYPE_MAINT_DUE',
      fuel_anomaly: 'DASHBOARD.ALERT_TYPE_FUEL',
      unknown: 'DASHBOARD.ALERT_TYPE_UNKNOWN',
    };
    const k = keys[type] ?? 'DASHBOARD.ALERT_TYPE_UNKNOWN';
    return this.t.instant(k);
  }
}
