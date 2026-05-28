import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

type MissionStatus = 'planned' | 'in_progress' | 'completed';
interface MissionRow {
  id: number;
  title: string;
  status: MissionStatus;
  trajets_count?: number;
}

@Component({
  selector: 'app-trajets-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>{{ 'NAV.TRAJETS' | translate }}</h2>
          <p class="muted">{{ 'TRAJETS.SUBTITLE' | translate }}</p>
        </div>
        <button class="btn" type="button" (click)="load()" [disabled]="loading()">{{ 'ADMIN.REFRESH' | translate }}</button>
      </div>

      @if (error()) { <div class="error">{{ error() }}</div> }

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
            @if (loading()) {
              <tr><td colspan="5" class="muted cell-pad">{{ 'COMMON.LOADING' | translate }}</td></tr>
            } @else if (missions().length === 0) {
              <tr><td colspan="5" class="empty-hint cell-pad">{{ 'TRAJETS.EMPTY' | translate }}</td></tr>
            } @else {
              @for (m of missions(); track m.id) {
                <tr>
                  <td>{{ m.id }}</td>
                  <td class="title">{{ m.title }}</td>
                  <td><span class="pill" [class]="m.status">{{ m.status }}</span></td>
                  <td class="muted">{{ m.trajets_count ?? 0 }} pts</td>
                  <td><a class="link" [routerLink]="['/trajets', m.id]">{{ 'TRAJETS.OPEN' | translate }}</a></td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .head { display:flex; align-items:flex-start; justify-content:space-between; gap: 1rem; margin-bottom: 1rem; }
    .muted { color:#6b7280; margin:.25rem 0 0; }
    .btn { padding: 6px 10px; border: 1px solid #d1d5db; background: #fff; border-radius: 10px; cursor: pointer; font-weight: 750; }
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
    .cell-pad { padding: 1.25rem 12px !important; vertical-align: top; }
    .empty-hint { color:#475569; line-height: 1.5; font-size: .95rem; }
  `],
})
export class TrajetsListComponent {
  missions = signal<MissionRow[]>([]);
  loading = signal(false);
  error = signal('');

  constructor(private api: ApiService) {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<{ data: MissionRow[] }>('/missions').subscribe({
      next: (r) => {
        this.missions.set(r.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load missions.');
      },
    });
  }
}

