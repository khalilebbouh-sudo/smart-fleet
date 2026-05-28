import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type MissionRow = { id: number; title: string; status: string };

@Component({
  selector: 'app-report-incident',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h2>{{ 'INCIDENTS.REPORT_TITLE' | translate }}</h2>
      <p class="muted">{{ 'INCIDENTS.REPORT_SUBTITLE' | translate }}</p>

      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (ok()) { <div class="ok">{{ ok() }}</div> }

      <div class="card">
        <label class="field">
          <span>{{ 'MISSIONS.NAME' | translate }}</span>
          <select [(ngModel)]="missionId">
            <option [ngValue]="null">—</option>
            @for (m of missions(); track m.id) {
              <option [ngValue]="m.id">{{ m.title }} ({{ m.status }})</option>
            }
          </select>
        </label>

        <label class="field">
          <span>{{ 'INCIDENTS.TYPE' | translate }}</span>
          <input [(ngModel)]="type" placeholder="ex: panne, accident..." />
        </label>

        <label class="field">
          <span>{{ 'INCIDENTS.DESCRIPTION' | translate }}</span>
          <textarea [(ngModel)]="description" rows="5" placeholder="Décrivez l'incident..."></textarea>
        </label>

        <div class="actions">
          <button class="btn" type="button" (click)="router.navigate(['/dashboard'])">{{ 'COMMON.CANCEL' | translate }}</button>
          <button class="btn primary" type="button" (click)="submit()" [disabled]="loading() || !description.trim()">
            {{ loading() ? ('COMMON.LOADING' | translate) : ('INCIDENTS.SUBMIT' | translate) }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; }
    .muted { color:#6b7280; margin:.25rem 0 1rem; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding: 14px 16px; }
    .field { display:flex; flex-direction:column; gap:.35rem; margin-bottom: .75rem; font-weight: 750; }
    input, textarea, select { border: 1px solid #d1d5db; border-radius: 10px; padding: .55rem .6rem; font: inherit; }
    textarea { resize: vertical; }
    .actions { display:flex; justify-content:flex-end; gap:.5rem; }
    .btn { padding: 6px 10px; border: 1px solid #d1d5db; background: #fff; border-radius: 10px; cursor: pointer; font-weight: 750; }
    .btn.primary { background:#0f766e; border-color:#0f766e; color:#fff; }
    .error { padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 12px; margin-bottom: 1rem; }
    .ok { padding: 10px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 12px; margin-bottom: 1rem; }
  `],
})
export class ReportIncidentComponent {
  loading = signal(false);
  error = signal('');
  ok = signal('');

  missions = signal<MissionRow[]>([]);
  type = '';
  description = '';
  missionId: number | null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private route: ActivatedRoute,
    public router: Router,
  ) {
    const id = this.route.snapshot.queryParamMap.get('missionId');
    this.missionId = id ? Number(id) : null;
    this.loadMissions();
  }

  private loadMissions(): void {
    if (this.auth.currentUser()?.role !== 'chauffeur') return;
    this.api.get<{ data: MissionRow[] }>('/missions').subscribe({
      next: (r) => this.missions.set(r.data),
      error: () => {},
    });
  }

  submit(): void {
    if (this.auth.currentUser()?.role !== 'chauffeur') {
      this.error.set('Forbidden');
      return;
    }
    if (!this.description.trim()) return;

    this.loading.set(true);
    this.error.set('');
    this.ok.set('');

    this.api.post('/incidents', {
      mission_id: this.missionId,
      type: this.type?.trim() || null,
      description: this.description.trim(),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.ok.set('Incident reported.');
        this.type = '';
        this.description = '';
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to report incident.');
      },
    });
  }
}

