import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, inject, NgZone, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import { filter, interval, Subscription } from 'rxjs';
import { bearingDeg, minDistanceToPolylineM } from '../../core/geo/geo-utils';
import { NavigationVoiceService } from '../../core/services/navigation-voice.service';
import { ApiService } from '../../core/services/api.service';
import { OsrmRouteService, type OsrmDrivingRoute } from '../../core/services/osrm-route.service';
import { RealtimePusherService } from '../../core/services/realtime-pusher.service';
import { createVehicleDivIcon } from './leaflet-vehicle-icon';
import { SmoothVehicleMarker } from './smooth-marker';

type MissionStatus = 'planned' | 'in_progress' | 'completed';
type TrajetPoint = { id: number; lat: number; lng: number; recorded_at?: string | null };
type MissionDetail = { id: number; title: string; status: MissionStatus; trajets: TrajetPoint[] };

@Component({
  selector: 'app-trajets-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './trajets-tracking.component.html',
  styleUrl: './trajets-tracking.component.scss',
})
export class TrajetsTrackingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  mission = signal<MissionDetail | null>(null);
  error = signal('');
  adding = signal(false);

  manualLat: number | null = null;
  manualLng: number | null = null;

  trackingWalk = signal(false);
  private watchId: number | null = null;
  private lastSentPos: { lat: number; lng: number } | null = null;
  private postingWalk = false;
  private readonly minWalkMeters = 25;
  private missionPoll?: Subscription;

  private vehicleSmooth?: SmoothVehicleMarker;
  private vehicleMarker?: L.Marker;
  private lastNavFix: { lat: number; lng: number } | null = null;

  /** Planned OSRM polyline for deviation detection */
  private plannedRouteLatLngs = signal<[number, number][]>([]);
  private readonly deviationThresholdM = 85;
  private recalcBusy = false;

  voiceOn = signal(false);
  navSteps = signal<Array<{ distanceM: number; durationSec: number; instruction: string }>>([]);
  primaryInstruction = signal('');
  rerouting = signal(false);

  /** OSRM road route planning */
  pickStage = signal<'idle' | 'start' | 'end'>('idle');
  startPoint = signal<{ lat: number; lng: number } | null>(null);
  endPoint = signal<{ lat: number; lng: number } | null>(null);
  routeLoading = signal(false);
  private routeDistanceM = signal<number | null>(null);
  private routeDurationSec = signal<number | null>(null);

  routeDistanceKm = computed(() => {
    const m = this.routeDistanceM();
    return m == null ? null : m / 1000;
  });

  routeDurationMin = computed(() => {
    const s = this.routeDurationSec();
    return s == null ? null : Math.max(1, Math.round(s / 60));
  });

  hasPlannedRoute = computed(() => this.routeDistanceM() != null && this.routeDurationSec() != null);

  private map?: L.Map;
  private poly?: L.Polyline;
  private pointsLayer?: L.LayerGroup;
  private routePoly?: L.Polyline;
  private startMarker?: L.Marker;
  private endMarker?: L.Marker;
  private id: number;

  private unsubRealtime?: () => void;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private osrm: OsrmRouteService,
    private voice: NavigationVoiceService,
    private realtime: RealtimePusherService,
  ) {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngAfterViewInit(): void {
    if (!this.mapEl?.nativeElement) return;
    this.initMap();
    this.load();
    if (this.realtime.isConfigured()) {
      this.unsubRealtime = this.realtime.subscribeMissionTrajets(this.id, () => this.refreshMission());
    }
  }

  ngOnDestroy(): void {
    this.unsubRealtime?.();
    this.stopWalkTracking();
    this.voice.stop();
    this.missionPoll?.unsubscribe();
    this.map?.off('click');
    this.map?.remove();
  }

  toggleVoice(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.voiceOn.set(on);
    this.voice.setEnabled(on);
    if (!on) {
      this.voice.stop();
    }
  }

  pickBannerText(): string {
    switch (this.pickStage()) {
      case 'start':
        return this.translate.instant('TRAJETS.PICK_HINT_START');
      case 'end':
        return this.translate.instant('TRAJETS.PICK_HINT_END');
      default:
        return '';
    }
  }

  geoSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }

  beginPickStart(): void {
    this.error.set('');
    this.pickStage.set('start');
    this.updateMapCursor(true);
  }

  beginPickEnd(): void {
    if (!this.startPoint()) {
      this.error.set(this.translate.instant('TRAJETS.NEED_START_FIRST'));
      return;
    }
    this.error.set('');
    this.pickStage.set('end');
    this.updateMapCursor(true);
  }

  useGpsAsStart(): void {
    if (!this.geoSupported()) {
      this.error.set(this.translate.instant('TRAJETS.GEO_FAILED'));
      return;
    }
    this.error.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ngZone.run(() => {
          this.placeStart(pos.coords.latitude, pos.coords.longitude);
          this.pickStage.set('end');
          this.updateMapCursor(true);
        });
      },
      (geoErr) => {
        const code = (geoErr as GeolocationPositionError)?.code;
        const key =
          code === 1 ? 'TRAJETS.GEO_DENIED' : code === 2 ? 'TRAJETS.GEO_UNAVAILABLE' : code === 3 ? 'TRAJETS.GEO_TIMEOUT' : 'TRAJETS.GEO_FAILED';
        this.ngZone.run(() => this.error.set(this.translate.instant(key)));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  clearPlannedRoute(): void {
    this.pickStage.set('idle');
    this.updateMapCursor(false);
    this.startPoint.set(null);
    this.endPoint.set(null);
    this.routeDistanceM.set(null);
    this.routeDurationSec.set(null);
    this.plannedRouteLatLngs.set([]);
    this.navSteps.set([]);
    this.primaryInstruction.set('');
    if (this.routePoly && this.map) {
      this.map.removeLayer(this.routePoly);
      this.routePoly = undefined;
    }
    if (this.startMarker && this.map) {
      this.map.removeLayer(this.startMarker);
      this.startMarker = undefined;
    }
    if (this.endMarker && this.map) {
      this.map.removeLayer(this.endMarker);
      this.endMarker = undefined;
    }
  }

  private updateMapCursor(active: boolean): void {
    const el = this.map?.getContainer();
    if (el) {
      el.style.cursor = active ? 'crosshair' : '';
    }
  }

  private onMapClick(e: L.LeafletMouseEvent): void {
    const stage = this.pickStage();
    if (stage === 'idle') return;
    const { lat, lng } = e.latlng;
    if (stage === 'start') {
      this.placeStart(lat, lng);
      this.pickStage.set('end');
      return;
    }
    if (stage === 'end') {
      this.placeEnd(lat, lng);
      this.fetchRoute();
      this.pickStage.set('idle');
      this.updateMapCursor(false);
    }
  }

  private placeStart(lat: number, lng: number): void {
    this.startPoint.set({ lat, lng });
    if (!this.map) return;
    if (this.startMarker) {
      this.map.removeLayer(this.startMarker);
    }
    this.startMarker = L.marker([lat, lng], {
      icon: this.waypointIcon('#22c55e'),
      zIndexOffset: 600,
    }).addTo(this.map);
  }

  private placeEnd(lat: number, lng: number): void {
    this.endPoint.set({ lat, lng });
    if (!this.map) return;
    if (this.endMarker) {
      this.map.removeLayer(this.endMarker);
    }
    this.endMarker = L.marker([lat, lng], {
      icon: this.waypointIcon('#ef4444'),
      zIndexOffset: 600,
    }).addTo(this.map);
  }

  private waypointIcon(color: string): L.DivIcon {
    return L.divIcon({
      className: 'wp-marker',
      html: `<div class="pin" style="background:${color}"></div>`,
      iconSize: [28, 36],
      iconAnchor: [14, 32],
    });
  }

  private fetchRoute(): void {
    const a = this.startPoint();
    const b = this.endPoint();
    if (!a || !b || !this.map) return;
    this.routeLoading.set(true);
    this.error.set('');
    this.osrm
      .getDrivingRoute([a, b], { steps: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (route) => {
          this.routeLoading.set(false);
          this.applyRouteResult(route, true);
        },
        error: () => {
          this.routeLoading.set(false);
          this.error.set(this.translate.instant('TRAJETS.ROUTE_FAILED'));
        },
      });
  }

  private applyRouteResult(route: OsrmDrivingRoute, fitBounds: boolean): void {
    this.routeDistanceM.set(route.distanceM);
    this.routeDurationSec.set(route.durationSec);
    this.plannedRouteLatLngs.set(route.latLngs);
    const steps = route.steps ?? [];
    this.navSteps.set(steps);
    this.primaryInstruction.set(steps[0]?.instruction ?? '');
    if (this.routePoly && this.map) {
      this.map.removeLayer(this.routePoly);
    }
    this.routePoly = L.polyline(route.latLngs, {
      color: '#2563eb',
      weight: 6,
      opacity: 0.88,
      lineJoin: 'round',
    }).addTo(this.map!);
    if (fitBounds) {
      const b = L.latLngBounds(route.latLngs as L.LatLngExpression[]);
      this.map!.fitBounds(b.pad(0.08));
    }
    if (this.voiceOn() && steps.length) {
      this.voice.speak(steps[0].instruction);
    }
  }

  /** Recalculate from current GPS position to destination when driver leaves corridor. */
  private maybeReroute(lat: number, lng: number): void {
    const poly = this.plannedRouteLatLngs();
    const dest = this.endPoint();
    if (poly.length < 2 || !dest || this.recalcBusy || !this.hasPlannedRoute()) {
      return;
    }
    const d = minDistanceToPolylineM({ lat, lng }, poly);
    if (d <= this.deviationThresholdM) {
      return;
    }
    this.recalcBusy = true;
    this.rerouting.set(true);
    this.osrm
      .getDrivingRoute([{ lat, lng }, dest], { steps: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (route) => {
          this.recalcBusy = false;
          this.rerouting.set(false);
          this.applyRouteResult(route, false);
          if (this.voiceOn()) {
            this.voice.speak(this.translate.instant('TRAJETS.REROUTE_VOICE'));
          }
        },
        error: () => {
          this.recalcBusy = false;
          this.rerouting.set(false);
        },
      });
  }

  private haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const la1 = toRad(a.lat);
    const la2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  startWalkTracking(): void {
    if (!this.geoSupported()) {
      this.error.set(this.translate.instant('TRAJETS.GEO_FAILED'));
      return;
    }
    this.stopWalkTracking();
    this.error.set('');
    this.lastSentPos = null;
    this.lastNavFix = null;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const cur = { lat, lng };
        let heading: number | undefined =
          pos.coords.heading != null && !Number.isNaN(pos.coords.heading) ? pos.coords.heading : undefined;
        if (heading == null && this.lastNavFix) {
          heading = bearingDeg(this.lastNavFix, cur);
        }
        this.lastNavFix = cur;

        this.ngZone.run(() => {
          this.ensureVehicleMarker(lat, lng);
          this.vehicleSmooth?.setTarget(lat, lng, heading);
          this.maybeReroute(lat, lng);
        });

        if (this.lastSentPos && this.haversineM(this.lastSentPos, cur) < this.minWalkMeters) {
          return;
        }
        if (this.postingWalk) {
          return;
        }
        this.postingWalk = true;
        this.api.post(`/missions/${this.id}/trajets`, { lat, lng }).subscribe({
          next: () => {
            this.postingWalk = false;
            this.lastSentPos = cur;
            this.refreshMission();
          },
          error: (err) => {
            this.postingWalk = false;
            this.ngZone.run(() =>
              this.error.set(err?.error?.message || this.translate.instant('TRAJETS.ADD_FAILED')),
            );
          },
        });
      },
      (geoErr) => {
        const code = (geoErr as GeolocationPositionError)?.code;
        const key =
          code === 1 ? 'TRAJETS.GEO_DENIED' : code === 2 ? 'TRAJETS.GEO_UNAVAILABLE' : code === 3 ? 'TRAJETS.GEO_TIMEOUT' : 'TRAJETS.GEO_FAILED';
        this.ngZone.run(() => {
          this.error.set(this.translate.instant(key));
          this.stopWalkTracking();
        });
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 25000 },
    );
    this.trackingWalk.set(true);

    this.missionPoll?.unsubscribe();
    this.missionPoll = interval(12000)
      .pipe(filter(() => this.trackingWalk()))
      .subscribe(() => this.refreshMission());
  }

  private ensureVehicleMarker(lat: number, lng: number): void {
    if (!this.map) return;
    if (!this.vehicleMarker) {
      const icon = createVehicleDivIcon();
      this.vehicleMarker = L.marker([lat, lng], { icon, zIndexOffset: 2500 }).addTo(this.map);
      const el = this.vehicleMarker.getElement()?.querySelector('.vehicle-leaflet-car') as HTMLElement | null;
      this.vehicleSmooth = new SmoothVehicleMarker(this.vehicleMarker, el, { lat, lng });
    }
  }

  private syncVehicleToPosition(lat: number, lng: number, heading?: number): void {
    if (!this.map) return;
    if (!this.vehicleMarker) {
      this.ensureVehicleMarker(lat, lng);
      return;
    }
    this.vehicleSmooth?.snapTo(lat, lng, heading);
  }

  stopWalkTracking(): void {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.trackingWalk.set(false);
    this.lastSentPos = null;
    this.lastNavFix = null;
    this.postingWalk = false;
    this.missionPoll?.unsubscribe();
    this.missionPoll = undefined;
    this.voice.stop();
    this.vehicleSmooth?.destroy();
    this.vehicleSmooth = undefined;
    if (this.vehicleMarker && this.map) {
      this.map.removeLayer(this.vehicleMarker);
      this.vehicleMarker = undefined;
    }
  }

  private initMap(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });

    const center: L.LatLngExpression = [36.8065, 10.1815];
    this.map = L.map(this.mapEl!.nativeElement, { zoomControl: true }).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.pointsLayer = L.layerGroup().addTo(this.map);
    this.poly = L.polyline([], { color: '#0f766e', weight: 4 }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e));
  }

  private renderTrajets(points: TrajetPoint[]): void {
    if (!this.map || !this.poly || !this.pointsLayer) return;
    this.pointsLayer.clearLayers();
    const latlngs: L.LatLngExpression[] = points.map((p) => [p.lat, p.lng]);
    this.poly.setLatLngs(latlngs);
    points.forEach((p) => L.circleMarker([p.lat, p.lng], { radius: 5, color: '#0f766e' }).addTo(this.pointsLayer!));
    if (latlngs.length) {
      const b = L.latLngBounds(latlngs as any);
      if (!this.routePoly) {
        this.map.fitBounds(b.pad(0.2));
      }
    }
  }

  load(): void {
    this.api.get<{ data: MissionDetail }>(`/missions/${this.id}`).subscribe({
      next: (r) => {
        this.mission.set(r.data);
        this.renderTrajets(r.data.trajets || []);
      },
      error: (err) => this.error.set(err?.error?.message || 'Failed to load mission.'),
    });
  }

  private refreshMission(): void {
    this.api.get<{ data: MissionDetail }>(`/missions/${this.id}`).subscribe({
      next: (r) => {
        this.mission.set(r.data);
        this.renderTrajets(r.data.trajets || []);
      },
      error: () => {},
    });
  }

  addPoint(): void {
    if (!navigator.geolocation) {
      this.error.set('Geolocation not supported.');
      return;
    }
    this.adding.set(true);
    this.error.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const h =
          pos.coords.heading != null && !Number.isNaN(pos.coords.heading) ? pos.coords.heading : undefined;
        this.ngZone.run(() => this.syncVehicleToPosition(lat, lng, h));
        this.api.post(`/missions/${this.id}/trajets`, { lat, lng }).subscribe({
          next: () => {
            this.adding.set(false);
            this.refreshMission();
          },
          error: (err) => {
            this.adding.set(false);
            this.error.set(err?.error?.message || 'Failed to add point.');
          },
        });
      },
      (geoErr) => {
        this.adding.set(false);
        const code = (geoErr as GeolocationPositionError)?.code;
        const key =
          code === 1 ? 'TRAJETS.GEO_DENIED' : code === 2 ? 'TRAJETS.GEO_UNAVAILABLE' : code === 3 ? 'TRAJETS.GEO_TIMEOUT' : 'TRAJETS.GEO_FAILED';
        this.error.set(this.translate.instant(key));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  addManualPoint(): void {
    const lat = Number(this.manualLat);
    const lng = Number(this.manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      this.error.set(this.translate.instant('TRAJETS.MANUAL_INVALID'));
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.error.set(this.translate.instant('TRAJETS.MANUAL_INVALID'));
      return;
    }
    this.adding.set(true);
    this.error.set('');
    this.api.post(`/missions/${this.id}/trajets`, { lat, lng }).subscribe({
      next: () => {
        this.adding.set(false);
        this.refreshMission();
      },
      error: (err) => {
        this.adding.set(false);
        this.error.set(err?.error?.message || this.translate.instant('TRAJETS.ADD_FAILED'));
      },
    });
  }
}
