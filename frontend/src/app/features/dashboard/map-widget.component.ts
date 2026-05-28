import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { ApiService } from '../../core/services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type VehicleItem = {
  id: number;
  license_plate: string;
  brand: string;
  model: string;
  status: string;
};

type VehicleSim = VehicleItem & {
  lat: number;
  lng: number;
  headingDeg: number;
  simKmh: number;
  history: Array<[number, number]>;
};

@Component({
  selector: 'app-map-widget',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-shell">
      <div class="map-top">
        <div>
          <div class="map-title">{{ 'MAP.TITLE' | translate }}</div>
          <div class="map-sub">{{ 'MAP.SUBTITLE' | translate }}</div>
        </div>
        <div class="map-actions">
          <div class="speed">
            <span class="speed-label">{{ 'MAP.SPEED' | translate }}</span>
            <select class="speed-select" [value]="speedMs" (change)="setSpeed($any($event.target).value)">
              <option [value]="1400">{{ 'MAP.SPEED_SLOW' | translate }}</option>
              <option [value]="900">{{ 'MAP.SPEED_NORMAL' | translate }}</option>
              <option [value]="500">{{ 'MAP.SPEED_FAST' | translate }}</option>
            </select>
          </div>
          <button type="button" class="btn btn-sm" (click)="toggleHistory()">
            {{ showHistory ? ('MAP.HIDE_ROUTES' | translate) : ('MAP.SHOW_ROUTES' | translate) }}
          </button>
          <button type="button" class="btn btn-sm btn-primary" (click)="recenter()">
            {{ 'MAP.RECENTER' | translate }}
          </button>
        </div>
      </div>

      <div class="legend">
        <div class="lg-item"><span class="lg-dot moving"></span> {{ 'MAP.LEGEND_MOVING' | translate }}</div>
        <div class="lg-item"><span class="lg-dot stopped"></span> {{ 'MAP.LEGEND_STOPPED' | translate }}</div>
        <div class="lg-item"><span class="lg-dot inactive"></span> {{ 'MAP.LEGEND_INACTIVE' | translate }}</div>
        <div class="lg-item"><span class="lg-dot offline"></span> {{ 'MAP.LEGEND_OFFLINE' | translate }}</div>
      </div>

      <div class="map" #mapEl></div>
    </div>
  `,
  styles: [`
    .map-shell { display:flex; flex-direction:column; gap: .55rem; height: 100%; min-height: 0; }
    .map-top { display:flex; align-items:flex-end; justify-content:space-between; gap: .75rem; flex-wrap: wrap; }
    .map-title { font-weight: 900; color: rgba(226,232,240,.96); letter-spacing: -.01em; }
    .map-sub { font-size: .8rem; color: rgba(148,163,184,.88); margin-top: .12rem; }
    .map-actions { display:flex; gap: .45rem; flex-wrap: wrap; align-items: center; }
    .speed { display:flex; align-items:center; gap: .45rem; padding: .28rem .5rem; border-radius: 12px; border: 1px solid rgba(148,163,184,.14); background: rgba(2,6,23,.45); }
    .speed-label { font-size: .74rem; color:rgba(148,163,184,.9); font-weight: 800; }
    .speed-select { border: none; outline: none; font-size: .8rem; color:rgba(226,232,240,.95); background: transparent; cursor: pointer; }
    .btn { border-radius: 12px; border: 1px solid rgba(148,163,184,.16); background: rgba(255,255,255,.04); color: rgba(226,232,240,.92); font-weight: 800; font-size: .78rem; padding: .35rem .65rem; cursor: pointer; transition: border-color .15s, transform .15s; }
    .btn:hover { border-color: rgba(56,189,248,.35); transform: translateY(-1px); }
    .btn-primary { border-color: rgba(56,189,248,.28); background: linear-gradient(135deg, rgba(56,189,248,.2), rgba(59,130,246,.12)); }
    .legend { display:flex; gap: .55rem; flex-wrap: wrap; }
    .lg-item { display:flex; align-items:center; gap: .35rem; font-size: .78rem; color:rgba(148,163,184,.9); font-weight: 700; }
    .lg-dot { width:10px; height:10px; border-radius: 999px; display:inline-block; box-shadow: 0 0 12px currentColor; }
    .lg-dot.moving { background:#22c55e; color:#22c55e; }
    .lg-dot.stopped { background:#f59e0b; color:#f59e0b; }
    .lg-dot.inactive { background:#a78bfa; color:#a78bfa; }
    .lg-dot.offline { background:#fb7185; color:#fb7185; }
    .map { flex: 1; min-height: 300px; height: 100%; border-radius: 16px; overflow:hidden; border: 1px solid rgba(56,189,248,.12); box-shadow: inset 0 0 40px rgba(0,0,0,.35); }
    @media (min-width: 1200px) { .map { min-height: 360px; } }
    :host ::ng-deep .leaflet-control-zoom a {
      background: rgba(2,6,23,.88) !important;
      color: rgba(226,232,240,.95) !important;
      border-color: rgba(148,163,184,.2) !important;
    }
    :host ::ng-deep .leaflet-control-attribution {
      font-size: 10px;
      background: rgba(2,6,23,.75) !important;
      color: rgba(148,163,184,.75) !important;
      border-radius: 8px 0 0 0;
    }
    :host ::ng-deep .leaflet-container { background: #e5e7eb; font-family: inherit; }
    :host ::ng-deep .fleet-pin .pin-inner { will-change: transform; }
    :host ::ng-deep .sf-leaflet-popup .leaflet-popup-content-wrapper {
      background: rgba(2, 6, 23, 0.92) !important;
      border: 1px solid rgba(56, 189, 248, 0.22) !important;
      border-radius: 16px !important;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55) !important;
      color: rgba(226, 232, 240, 0.96) !important;
      backdrop-filter: blur(12px);
    }
    :host ::ng-deep .sf-leaflet-popup .leaflet-popup-tip { background: rgba(2, 6, 23, 0.92) !important; border: 1px solid rgba(56, 189, 248, 0.18) !important; }
    :host ::ng-deep .sf-leaflet-popup .leaflet-popup-content { margin: 12px 14px !important; min-width: 200px; }
    :host ::ng-deep .sf-popup .sf-popup-plate { font-weight: 900; font-size: 1rem; letter-spacing: -0.02em; }
    :host ::ng-deep .sf-popup .sf-popup-meta { margin-top: 2px; font-size: 0.82rem; color: rgba(148, 163, 184, 0.92); }
    :host ::ng-deep .sf-popup .sf-popup-row { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 12px; }
    :host ::ng-deep .sf-popup .k { color: rgba(148, 163, 184, 0.88); }
    :host ::ng-deep .sf-popup .v { font-weight: 800; color: rgba(56, 189, 248, 0.95); }
    :host ::ng-deep .sf-popup .sf-popup-btn {
      display: block; margin-top: 12px; text-align: center; padding: 8px 12px; border-radius: 12px;
      font-weight: 900; font-size: 12px; text-decoration: none;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(59, 130, 246, 0.2));
      color: #f8fafc !important; border: 1px solid rgba(56, 189, 248, 0.35);
    }
  `],
})
export class MapWidgetComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private markers = new Map<number, L.Marker>();
  private polylines = new Map<number, L.Polyline>();
  private vehicles: VehicleSim[] = [];
  private tick?: number;
  /** Refresh polylines every N simulation ticks (half the DOM work vs markers). */
  private polylineTick = 0;

  showHistory = true;
  /** Slower default + longer tick = less main-thread work with many Apex charts on the dashboard */
  speedMs = 1400;

  constructor(
    private api: ApiService,
    private translate: TranslateService,
    private ngZone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    if (!this.mapEl?.nativeElement) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });

    const center: L.LatLngExpression = [36.8065, 10.1815];
    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      preferCanvas: true,
    }).setView(center, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.loadVehicles();
  }

  ngOnDestroy(): void {
    if (this.tick) window.clearInterval(this.tick);
    this.tick = undefined;
    this.map?.remove();
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    this.updatePolylines();
  }

  setSpeed(v: string | number): void {
    const ms = Number(v);
    if (!Number.isFinite(ms)) return;
    this.speedMs = ms;
    this.startTick();
  }

  recenter(): void {
    if (!this.map || this.vehicles.length === 0) return;
    const bounds = L.latLngBounds(this.vehicles.map((v) => [v.lat, v.lng] as [number, number]));
    this.map.fitBounds(bounds.pad(0.25), { animate: true, duration: 0.6 });
  }

  private loadVehicles(): void {
    this.api.get<any>('/vehicles', { per_page: 200 }).subscribe({
      next: (res) => {
        const items: VehicleItem[] = (res?.data ?? res) as VehicleItem[];
        const baseLat = 36.8065;
        const baseLng = 10.1815;
        this.vehicles = (items ?? []).slice(0, 18).map((v, idx) => {
          const jitter = (n: number) => Math.sin((idx + 1) * 997 + n) * 0.02;
          const lat = baseLat + jitter(1);
          const lng = baseLng + jitter(2);
          return {
            ...v,
            lat,
            lng,
            headingDeg: (idx * 37) % 360,
            simKmh: v.status === 'inactive' ? 0 : v.status === 'maintenance' ? 8 + (idx % 5) : 28 + (idx % 18),
            history: [[lat, lng]],
          };
        });
        this.renderAll();
        this.startTick();
      },
    });
  }

  private startTick(): void {
    if (this.tick) window.clearInterval(this.tick);
    this.ngZone.runOutsideAngular(() => {
      this.tick = window.setInterval(() => {
        this.simulateStep();
        this.updateMarkers();
        this.polylineTick++;
        if (this.polylineTick % 2 === 0) {
          this.updatePolylines();
        }
      }, this.speedMs);
    });
  }

  private renderAll(): void {
    this.vehicles.forEach((v) => this.ensureMarker(v));
    this.updatePolylines();
    this.recenter();
  }

  private simulateStep(): void {
    const metersToDegrees = (m: number) => m / 111_111;
    this.vehicles.forEach((v, idx) => {
      const drift = Math.sin(Date.now() / 2500 + idx) * 6;
      v.headingDeg = (v.headingDeg + drift) % 360;

      const stepMeters = v.status === 'inactive' ? 0 : v.status === 'maintenance' ? 6 : 12;
      const d = metersToDegrees(stepMeters);
      const rad = (v.headingDeg * Math.PI) / 180;
      v.lat += Math.cos(rad) * d;
      v.lng += Math.sin(rad) * d;

      if (v.status !== 'inactive') {
        v.simKmh = Math.min(95, Math.max(0, v.simKmh + (Math.sin(Date.now() / 800 + idx) * 1.2)));
      } else {
        v.simKmh = 0;
      }

      const last = v.history[v.history.length - 1];
      const moved =
        !last || Math.abs(last[0] - v.lat) > 1e-7 || Math.abs(last[1] - v.lng) > 1e-7;
      if (moved) {
        v.history.push([v.lat, v.lng]);
        if (v.history.length > 48) v.history.shift();
      }
    });
  }

  private statusColor(status: string): string {
    if (status === 'maintenance') return '#f59e0b';
    if (status === 'inactive') return '#a78bfa';
    return '#22c55e';
  }

  private buildPopupHtml(v: VehicleSim): string {
    const st = (v.status ?? 'active').toString();
    const statusLabel = this.translate.instant(`VEHICLES.STATUS_${st.toUpperCase()}`);
    const safeStatus = statusLabel !== `VEHICLES.STATUS_${st.toUpperCase()}` ? statusLabel : st;
    const speedLbl = this.translate.instant('MAP.POPUP_SPEED');
    const statusLbl = this.translate.instant('MAP.POPUP_STATUS');
    const detailsLbl = this.translate.instant('MAP.POPUP_DETAILS');
    const km = Math.round(v.simKmh);
    return `
      <div class="sf-popup">
        <div class="sf-popup-plate">${v.license_plate}</div>
        <div class="sf-popup-meta">${v.brand} ${v.model}</div>
        <div class="sf-popup-row"><span class="k">${statusLbl}</span><span class="v">${safeStatus}</span></div>
        <div class="sf-popup-row"><span class="k">${speedLbl}</span><span class="v">${km} km/h</span></div>
        <a class="sf-popup-btn" href="/vehicles">${detailsLbl}</a>
      </div>
    `;
  }

  private ensureMarker(v: VehicleSim): void {
    if (!this.map) return;
    if (this.markers.has(v.id)) return;

    const col = this.statusColor(v.status);
    const icon = L.divIcon({
      className: 'fleet-pin',
      html: `
        <div class="pin-inner" style="
          width:40px;height:40px;border-radius:16px;
          background:${col};color:#fff;
          display:grid;place-items:center;
          box-shadow:0 0 0 2px rgba(255,255,255,.25), 0 12px 28px rgba(56,189,248,.25), 0 0 22px ${col}88;
          border:2px solid rgba(255,255,255,.35);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 16l-1-4 2-6h12l2 6-1 4" />
            <path d="M7 16a2 2 0 0 0 4 0" />
            <path d="M13 16a2 2 0 0 0 4 0" />
            <path d="M6 12h12" />
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -16],
    });

    const marker = L.marker([v.lat, v.lng], { icon }).addTo(this.map);
    marker.bindPopup(this.buildPopupHtml(v), { className: 'sf-leaflet-popup' });

    this.markers.set(v.id, marker);
  }

  private updateMarkers(): void {
    if (!this.map) return;
    this.vehicles.forEach((v) => {
      const m = this.markers.get(v.id);
      if (!m) {
        this.ensureMarker(v);
        return;
      }
      if (v.status !== 'inactive') {
        const prev = m.getLatLng();
        if (Math.abs(prev.lat - v.lat) > 1e-7 || Math.abs(prev.lng - v.lng) > 1e-7) {
          m.setLatLng([v.lat, v.lng]);
        }
      }
      const el = m.getElement()?.querySelector('.pin-inner') as HTMLElement | null;
      if (el && v.status !== 'inactive') {
        el.style.background = this.statusColor(v.status);
        el.style.boxShadow = `0 0 0 2px rgba(255,255,255,.25), 0 12px 28px rgba(56,189,248,.2), 0 0 22px ${this.statusColor(v.status)}88`;
      }
    });
  }

  private updatePolylines(): void {
    if (!this.map) return;

    if (!this.showHistory) {
      this.polylines.forEach((p) => p.remove());
      this.polylines.clear();
      return;
    }

    this.vehicles.forEach((v) => {
      const existing = this.polylines.get(v.id);
      const points = v.history.map(([lat, lng]) => [lat, lng] as [number, number]);
      const lineColor = '#38bdf8';
      if (existing) {
        existing.setLatLngs(points);
      } else {
        const line = L.polyline(points, {
          color: lineColor,
          weight: 3,
          opacity: 0.85,
          className: 'sf-route',
        }).addTo(this.map!);
        this.polylines.set(v.id, line);
      }
    });
  }
}
