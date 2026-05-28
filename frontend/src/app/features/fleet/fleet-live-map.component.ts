import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import * as L from 'leaflet';
import { interval, Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RealtimePusherService } from '../../core/services/realtime-pusher.service';
import { createVehicleDivIcon } from '../trajets/leaflet-vehicle-icon';

type FleetRow = {
  mission_id: number;
  title: string;
  status: string;
  vehicle: { license_plate: string; label: string } | null;
  driver: { id: number; name: string } | null;
  position: { lat: number; lng: number; recorded_at?: string | null } | null;
  points_count: number;
};

@Component({
  selector: 'app-fleet-live-map',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './fleet-live-map.component.html',
  styleUrl: './fleet-live-map.component.scss',
})
export class FleetLiveMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private map?: L.Map;
  private readonly markers = new Map<number, L.Marker>();
  private poll?: Subscription;
  private unsubFleet?: () => void;

  rows = signal<FleetRow[]>([]);
  loading = signal(true);
  lastRefresh = signal<Date | null>(null);

  constructor(
    private api: ApiService,
    private realtime: RealtimePusherService,
  ) {}

  ngAfterViewInit(): void {
    if (!this.mapEl?.nativeElement) return;
    this.initMap();
    this.refresh();

    this.poll = interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());

    if (this.realtime.isConfigured()) {
      this.unsubFleet = this.realtime.subscribeFleetLive(
        () => this.refresh(),
        () => this.refresh(),
      );
    }
  }

  ngOnDestroy(): void {
    this.unsubFleet?.();
    this.poll?.unsubscribe();
    this.markers.forEach((m) => m.remove());
    this.markers.clear();
    this.map?.remove();
  }

  private initMap(): void {
    const center: L.LatLngExpression = [36.8065, 10.1815];
    this.map = L.map(this.mapEl!.nativeElement, { zoomControl: true }).setView(center, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  refresh(): void {
    this.loading.set(true);
    this.api.get<{ data: FleetRow[] }>('/fleet/live').subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.lastRefresh.set(new Date());
        this.loading.set(false);
        this.syncMarkers(res.data);
      },
      error: () => this.loading.set(false),
    });
  }

  private syncMarkers(rows: FleetRow[]): void {
    if (!this.map) return;
    const activeIds = new Set(rows.map((r) => r.mission_id));
    this.markers.forEach((m, id) => {
      if (!activeIds.has(id)) {
        m.remove();
        this.markers.delete(id);
      }
    });

    const latlngs: L.LatLngExpression[] = [];
    for (const r of rows) {
      if (!r.position) continue;
      const ll: L.LatLngExpression = [r.position.lat, r.position.lng];
      latlngs.push(ll);
      let m = this.markers.get(r.mission_id);
      if (!m) {
        m = L.marker(ll, { icon: createVehicleDivIcon(), zIndexOffset: 400 }).addTo(this.map);
        this.markers.set(r.mission_id, m);
      } else {
        m.setLatLng(ll);
      }
      const veh = r.vehicle?.license_plate ?? '—';
      const drv = r.driver?.name ?? '—';
      m.bindPopup(`<strong>#${r.mission_id} ${this.escapeHtml(r.title)}</strong><br/>${this.escapeHtml(drv)} · ${this.escapeHtml(veh)}<br/><small>${r.points_count} pts</small>`);
    }

    if (latlngs.length === 1) {
      this.map.setView(latlngs[0], 13);
    } else if (latlngs.length > 1) {
      this.map.fitBounds(L.latLngBounds(latlngs as any), { padding: [36, 36], maxZoom: 14 });
    }
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
}
