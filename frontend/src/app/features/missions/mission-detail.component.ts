import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { MapWidgetComponent } from '../dashboard/map-widget.component';

type MissionStatus = 'planned' | 'in_progress' | 'completed';
interface MissionDetail {
  id: number;
  vehicle?: { id: number; brand: string; model: string; license_plate: string } | null;
  title: string;
  description?: string | null;
  status: MissionStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  trajets: Array<{ id: number; lat: number; lng: number; recorded_at?: string | null }>;
  incidents: Array<{ id: number; type?: string | null; description: string; status: string; created_at: string }>;
}

type TripReport = {
  distance_m: number;
  duration_sec: number;
  avg_speed_kmh: number | null;
  point_count: number;
};

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, MapWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="back" [routerLink]="backRoute()">← {{ 'MISSIONS.BACK' | translate }}</a>

      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (mission()) {
        <div class="head">
          <div>
            <h2>{{ mission()!.title }}</h2>
            <p class="muted" *ngIf="mission()!.description">{{ mission()!.description }}</p>
            <p class="muted small" *ngIf="mission()!.vehicle">
              Vehicle: {{ mission()!.vehicle!.brand }} {{ mission()!.vehicle!.model }} — {{ mission()!.vehicle!.license_plate }}
            </p>
          </div>
          <div class="actions">
            <span class="pill" [class]="mission()!.status">{{ mission()!.status }}</span>
            <button class="btn primary" *ngIf="canStart()" (click)="start()">{{ 'MISSIONS.START' | translate }}</button>
            <button class="btn" *ngIf="canComplete()" (click)="complete()">{{ 'MISSIONS.COMPLETE' | translate }}</button>
            <a class="btn" [routerLink]="['/incidents/report']" [queryParams]="{ missionId: mission()!.id }" *ngIf="canReportIncident()">
              {{ 'MISSIONS.REPORT_INCIDENT' | translate }}
            </a>
            <a class="btn" [routerLink]="['/trajets', mission()!.id]" *ngIf="canReportIncident()">
              {{ 'MISSIONS.OPEN_TRACKING' | translate }}
            </a>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>{{ 'MISSIONS.TRACKING' | translate }}</h3>
            <p class="muted">{{ 'MISSIONS.TRACKING_HINT' | translate }}</p>
            <div class="muted small">Points: {{ mission()!.trajets.length }}</div>

            <div class="map-wrap">
              <app-map-widget />
            </div>
          </div>

          @if (tripReport(); as tr) {
            <div class="card trip-report">
              <h3>{{ 'MISSIONS.TRIP_REPORT_TITLE' | translate }}</h3>
              <div class="trip-grid">
                <div>
                  <span class="muted small">{{ 'MISSIONS.TRIP_DISTANCE' | translate }}</span>
                  <div class="trip-val">{{ tr.distance_m / 1000 | number : '1.2-2' }} km</div>
                </div>
                <div>
                  <span class="muted small">{{ 'MISSIONS.TRIP_DURATION' | translate }}</span>
                  <div class="trip-val">{{ formatDuration(tr.duration_sec) }}</div>
                </div>
                <div>
                  <span class="muted small">{{ 'MISSIONS.TRIP_AVG_SPEED' | translate }}</span>
                  <div class="trip-val">{{ tr.avg_speed_kmh != null ? tr.avg_speed_kmh + ' km/h' : '—' }}</div>
                </div>
                <div>
                  <span class="muted small">{{ 'MISSIONS.TRIP_POINTS' | translate }}</span>
                  <div class="trip-val">{{ tr.point_count }}</div>
                </div>
              </div>
              <p class="muted small replay-hint">{{ 'MISSIONS.TRIP_REPLAY_HINT' | translate }}</p>
            </div>
          }

          <div class="card">
            <h3>{{ 'MISSIONS.INCIDENTS' | translate }}</h3>
            @if (mission()!.incidents.length === 0) {
              <div class="muted">{{ 'MISSIONS.NO_INCIDENTS' | translate }}</div>
            } @else {
              <ul class="list">
                @for (i of mission()!.incidents; track i.id) {
                  <li>
                    <div class="row">
                      <strong>#{{ i.id }}</strong>
                      <span class="muted">{{ i.created_at }}</span>
                    </div>
                    <div>{{ i.description }}</div>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      } @else {
        <div class="muted">{{ 'COMMON.LOADING' | translate }}</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .back { display:inline-block; margin-bottom: .75rem; color:#0f766e; font-weight:800; text-decoration:none; }
    .back:hover { text-decoration: underline; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom: 1rem; }
    h2 { margin: 0; }
    .muted { color:#6b7280; margin:.25rem 0 0; }
    .small { font-size:.85rem; }
    .actions { display:flex; gap:.5rem; align-items:center; flex-wrap: wrap; justify-content:flex-end; }
    .btn { padding: 6px 10px; border: 1px solid #d1d5db; background: #fff; border-radius: 10px; cursor: pointer; text-decoration:none; color:#111827; font-weight:700; }
    .btn.primary { background:#0f766e; border-color:#0f766e; color:#fff; }
    .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background:#f3f4f6; text-transform: capitalize; }
    .pill.planned { background:#eff6ff; color:#1d4ed8; }
    .pill.in_progress { background:#fff7ed; color:#c2410c; }
    .pill.completed { background:#ecfdf5; color:#065f46; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding: 14px 16px; }
    .map-wrap { height: 320px; margin-top: .75rem; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb; }
    .list { margin: .5rem 0 0; padding-left: 1rem; }
    .row { display:flex; justify-content:space-between; gap: .75rem; }
    .error { padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 12px; margin-bottom: 1rem; }
    .trip-grid { display:grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: .75rem; }
    .trip-val { font-weight:800; font-size: 1.05rem; margin-top: .15rem; }
    .replay-hint { margin: .75rem 0 0; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class MissionDetailComponent {
  loading = signal(false);
  error = signal('');
  mission = signal<MissionDetail | null>(null);
  tripReport = signal<TripReport | null>(null);

  private readonly id = computed(() => Number(this.route.snapshot.paramMap.get('id')));

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private route: ActivatedRoute,
  ) {
    this.load();
  }

  backRoute(): string {
    return this.auth.currentUser()?.role === 'chauffeur' ? '/my-missions' : '/missions';
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<{ data: MissionDetail }>(`/missions/${this.id()}`).subscribe({
      next: (res) => {
        this.mission.set(res.data);
        this.loading.set(false);
        this.loadTripReport(res.data.id, res.data.trajets?.length ?? 0);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load mission.');
      },
    });
  }

  canStart(): boolean {
    return this.auth.currentUser()?.role === 'chauffeur' && this.mission()?.status === 'planned';
  }
  canComplete(): boolean {
    return this.auth.currentUser()?.role === 'chauffeur' && this.mission()?.status === 'in_progress';
  }
  canReportIncident(): boolean {
    return this.auth.currentUser()?.role === 'chauffeur';
  }

  start(): void {
    const m = this.mission();
    if (!m) return;
    this.api.post<{ data: MissionDetail }>(`/missions/${m.id}/start`, {}).subscribe({ next: () => this.load() });
  }

  complete(): void {
    const m = this.mission();
    if (!m) return;
    this.api.post<{ data: MissionDetail }>(`/missions/${m.id}/complete`, {}).subscribe({ next: () => this.load() });
  }

  formatDuration(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} min ${s}s`;
  }

  private loadTripReport(missionId: number, trajetCount: number): void {
    if (trajetCount < 2) {
      this.tripReport.set(null);
      return;
    }
    this.api.get<{ data: TripReport }>(`/missions/${missionId}/trip-report`).subscribe({
      next: (r) => this.tripReport.set(r.data),
      error: () => this.tripReport.set(null),
    });
  }
}

