import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type MissionStatus = 'planned' | 'in_progress' | 'completed';
interface MissionRow {
  id: number;
  vehicle_id?: number | null;
  title: string;
  description?: string | null;
  status: MissionStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  trajets_count?: number;
  incidents_count?: number;
}

interface ChauffeurRow { id: number; name: string; email: string; role: 'chauffeur'; }
interface VehicleRow { id: number; brand: string; model: string; license_plate: string; status: string; }

@Component({
  selector: 'app-missions-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>{{ 'MISSIONS.TITLE' | translate }}</h2>
          <p class="muted">{{ 'MISSIONS.SUBTITLE' | translate }}</p>
        </div>
        <div class="head-actions">
          <button class="btn" (click)="load()" [disabled]="loading()">{{ 'ADMIN.REFRESH' | translate }}</button>
          @if (canCreate()) {
            <button class="btn primary" type="button" (click)="openCreate()">{{ 'MISSIONS.CREATE' | translate }}</button>
          }
        </div>
      </div>

      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (showCreate()) {
        <div class="modal-backdrop" (click)="closeCreate()"></div>
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <div class="modal-title">{{ 'MISSIONS.CREATE' | translate }}</div>
            <button class="icon-x" type="button" (click)="closeCreate()" aria-label="Close">×</button>
          </div>

          @if (isChauffeur()) {
            <p class="modal-hint">{{ 'MISSIONS.CREATE_CHAUFFEUR_HINT' | translate }}</p>
          }
          <div class="grid" [class.grid-one]="isChauffeur()">
            <label class="field">
              <span>{{ 'MISSIONS.NAME' | translate }}</span>
              <input [(ngModel)]="createTitle" placeholder="Mission title" />
            </label>
            <label class="field span-2">
              <span>{{ 'MISSIONS.DESCRIPTION' | translate }}</span>
              <textarea [(ngModel)]="createDescription" rows="3" placeholder="Description"></textarea>
            </label>
            @if (!isChauffeur()) {
              <label class="field">
                <span>{{ 'MISSIONS.ASSIGN_CHAUFFEUR' | translate }}</span>
                <select [(ngModel)]="createChauffeurId">
                  <option [ngValue]="null">—</option>
                  @for (c of chauffeurs(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }} ({{ c.email }})</option>
                  }
                </select>
              </label>
              <label class="field">
                <span>{{ 'MISSIONS.ASSIGN_VEHICLE' | translate }}</span>
                <select [(ngModel)]="createVehicleId">
                  <option [ngValue]="null">—</option>
                  @for (v of vehicles(); track v.id) {
                    <option [ngValue]="v.id">{{ v.brand }} {{ v.model }} — {{ v.license_plate }}</option>
                  }
                </select>
              </label>
            }
          </div>

          <div class="modal-actions">
            <button class="btn" type="button" (click)="closeCreate()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn primary" type="button" (click)="createMission()" [disabled]="creating() || !createTitle.trim()">
              {{ creating() ? ('COMMON.LOADING' | translate) : ('COMMON.SAVE' | translate) }}
            </button>
          </div>
        </div>
      }

      <div class="filters">
        <button class="chip" [class.on]="filter() === 'all'" (click)="filter.set('all')">{{ 'MISSIONS.ALL' | translate }}</button>
        <button class="chip" [class.on]="filter() === 'planned'" (click)="filter.set('planned')">{{ 'MISSIONS.PLANNED' | translate }}</button>
        <button class="chip" [class.on]="filter() === 'in_progress'" (click)="filter.set('in_progress')">{{ 'MISSIONS.IN_PROGRESS' | translate }}</button>
        <button class="chip" [class.on]="filter() === 'completed'" (click)="filter.set('completed')">{{ 'MISSIONS.COMPLETED' | translate }}</button>
      </div>

      <div class="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ 'MISSIONS.NAME' | translate }}</th>
              <th>{{ 'MISSIONS.STATUS' | translate }}</th>
              <th>{{ 'MISSIONS.TRACKING' | translate }}</th>
              <th>{{ 'COMMON.ACTIONS' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (m of filtered(); track m.id) {
              <tr>
                <td>{{ m.id }}</td>
                <td>
                  <div class="title">{{ m.title }}</div>
                  <div class="muted small" *ngIf="m.description">{{ m.description }}</div>
                </td>
                <td><span class="pill" [class]="m.status">{{ m.status }}</span></td>
                <td class="muted">{{ (m.trajets_count ?? 0) }} trajets · {{ (m.incidents_count ?? 0) }} incidents</td>
                <td><a class="link" [routerLink]="detailLink(m.id)">{{ 'MISSIONS.DETAILS' | translate }}</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .head { display:flex; align-items:flex-start; justify-content:space-between; gap: 1rem; margin-bottom: 1rem; }
    .head-actions { display:flex; gap: .5rem; align-items:center; flex-wrap: wrap; justify-content:flex-end; }
    .muted { color:#6b7280; margin:.25rem 0 0; }
    .small { font-size: .82rem; }
    .filters { display:flex; gap:.5rem; margin: .6rem 0 1rem; flex-wrap: wrap; }
    .chip { border:1px solid #d1d5db; background:#fff; padding:.35rem .7rem; border-radius:999px; cursor:pointer; font-weight:700; font-size:.85rem; }
    .chip.on { background:#0f766e; color:#fff; border-color:#0f766e; }
    .btn { padding: 6px 10px; border: 1px solid #d1d5db; background: #fff; border-radius: 10px; cursor: pointer; font-weight: 750; }
    .btn.primary { background:#0f766e; border-color:#0f766e; color:#fff; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden; }
    table { width:100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; text-align:left; }
    .title { font-weight: 850; }
    .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background:#f3f4f6; text-transform: capitalize; }
    .pill.planned { background:#eff6ff; color:#1d4ed8; }
    .pill.in_progress { background:#fff7ed; color:#c2410c; }
    .pill.completed { background:#ecfdf5; color:#065f46; }
    .link { color:#0f766e; font-weight:800; text-decoration:none; }
    .link:hover { text-decoration: underline; }
    .error { padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 12px; margin-bottom: 1rem; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.45); }
    .modal { position: fixed; top: 12vh; left: 50%; transform: translateX(-50%); width: min(720px, calc(100vw - 24px)); background:#fff; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 30px 80px rgba(0,0,0,.25); padding: 14px 16px; z-index: 30; }
    .modal-head { display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; }
    .modal-title { font-weight: 900; font-size: 1.05rem; }
    .icon-x { width: 34px; height: 34px; border-radius: 12px; border: 1px solid #e5e7eb; background:#fff; cursor:pointer; font-size: 18px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .field { display:flex; flex-direction:column; gap:.35rem; font-weight: 750; font-size: .9rem; }
    input, textarea, select { border: 1px solid #d1d5db; border-radius: 10px; padding: .55rem .6rem; font: inherit; }
    textarea { resize: vertical; }
    .modal-actions { margin-top: 12px; display:flex; justify-content:flex-end; gap:.5rem; }
    .modal-hint { margin: 0 0 12px; padding: 10px 12px; background: rgba(15,118,110,.08); border-radius: 12px; color: #0f766e; font-size: .9rem; line-height: 1.45; }
    .grid-one { grid-template-columns: 1fr !important; }
    .span-2 { grid-column: 1 / -1; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } .modal { top: 8vh; } }
  `],
})
export class MissionsListComponent {
  loading = signal(false);
  creating = signal(false);
  error = signal('');
  filter = signal<'all' | MissionStatus>('all');
  missions = signal<MissionRow[]>([]);
  chauffeurs = signal<ChauffeurRow[]>([]);
  vehicles = signal<VehicleRow[]>([]);

  showCreate = signal(false);
  createTitle = '';
  createDescription = '';
  createChauffeurId: number | null = null;
  createVehicleId: number | null = null;

  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.missions() : this.missions().filter(m => m.status === f);
  });

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {
    this.load();
  }

  canCreate(): boolean {
    const r = this.auth.currentUser()?.role;
    return r === 'admin' || r === 'gestionnaire' || r === 'chauffeur';
  }

  isChauffeur(): boolean {
    return this.auth.currentUser()?.role === 'chauffeur';
  }

  /** Route base pour le détail : `/my-missions` (conducteur) ou `/missions` (gestion). */
  detailLink(id: number): string[] {
    return this.isChauffeur() ? ['/my-missions', String(id)] : ['/missions', String(id)];
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<{ data: MissionRow[] }>('/missions').subscribe({
      next: (res) => {
        this.missions.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load missions.');
      },
    });
  }

  openCreate(): void {
    this.showCreate.set(true);
    this.createTitle = '';
    this.createDescription = '';
    this.createChauffeurId = null;
    this.createVehicleId = null;
    if (!this.isChauffeur()) {
      this.loadCreateData();
    }
  }

  closeCreate(): void {
    this.showCreate.set(false);
  }

  private loadCreateData(): void {
    this.api.get<{ data: ChauffeurRow[] }>('/chauffeurs').subscribe({
      next: (r) => this.chauffeurs.set(r.data),
      error: () => {},
    });
    this.api.get<{ data: VehicleRow[] }>('/vehicles').subscribe({
      next: (r) => this.vehicles.set(r.data),
      error: () => {},
    });
  }

  createMission(): void {
    if (!this.canCreate() || !this.createTitle.trim()) return;
    this.creating.set(true);
    this.error.set('');

    const body = this.isChauffeur()
      ? {
          title: this.createTitle.trim(),
          description: this.createDescription?.trim() || null,
        }
      : {
          title: this.createTitle.trim(),
          description: this.createDescription?.trim() || null,
          chauffeur_id: this.createChauffeurId,
          vehicle_id: this.createVehicleId,
        };

    this.api.post<{ data: MissionRow }>('/missions', body).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreate.set(false);
        this.load();
      },
      error: (err) => {
        this.creating.set(false);
        this.error.set(err?.error?.message || 'Failed to create mission.');
      },
    });
  }
}

