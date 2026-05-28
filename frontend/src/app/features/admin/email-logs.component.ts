import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EmailLogService, type EmailLog } from '../../core/services/email-log.service';

@Component({
  selector: 'app-email-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>{{ 'EMAIL_LOGS.TITLE' | translate }}</h2>
          <p class="muted">{{ 'EMAIL_LOGS.SUBTITLE' | translate }}</p>
        </div>
        <button class="btn" (click)="load()">{{ 'ADMIN.REFRESH' | translate }}</button>
      </div>

      <div class="filters card">
        <label class="field">
          <span>{{ 'EMAIL_LOGS.FILTER_TYPE' | translate }}</span>
          <select [(ngModel)]="type">
            <option [ngValue]="''">—</option>
            <option value="mission_started">mission_started</option>
            <option value="mission_completed">mission_completed</option>
            <option value="mission_assigned_chauffeur">mission_assigned_chauffeur</option>
            <option value="mission_started_chauffeur_notice">mission_started_chauffeur_notice</option>
            <option value="mission_completed_chauffeur_notice">mission_completed_chauffeur_notice</option>
            <option value="incident_reported">incident_reported</option>
            <option value="incident_report_confirmation_chauffeur">incident_report_confirmation_chauffeur</option>
            <option value="maintenance_alert">maintenance_alert</option>
            <option value="password_reset">password_reset</option>
          </select>
        </label>
        <label class="field">
          <span>{{ 'EMAIL_LOGS.FILTER_STATUS' | translate }}</span>
          <select [(ngModel)]="status">
            <option [ngValue]="''">—</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
            <option value="skipped">skipped</option>
          </select>
        </label>
        <label class="field">
          <span>{{ 'EMAIL_LOGS.FILTER_TO' | translate }}</span>
          <input [(ngModel)]="toEmail" placeholder="user@example.com" />
        </label>
        <button class="btn primary" (click)="load()" [disabled]="loading()">{{ loading() ? ('COMMON.LOADING' | translate) : ('EMAIL_LOGS.APPLY' | translate) }}</button>
      </div>

      @if (error()) { <div class="error">{{ error() }}</div> }

      <div class="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ 'EMAIL_LOGS.TYPE' | translate }}</th>
              <th>{{ 'EMAIL_LOGS.TO' | translate }}</th>
              <th>{{ 'EMAIL_LOGS.SUBJECT' | translate }}</th>
              <th>{{ 'EMAIL_LOGS.STATUS' | translate }}</th>
              <th>{{ 'EMAIL_LOGS.SENT_AT' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @if (items().length === 0) {
              <tr><td colspan="6" class="muted">{{ 'COMMON.NO_DATA' | translate }}</td></tr>
            } @else {
              @for (it of items(); track it.id) {
                <tr>
                  <td>{{ it.id }}</td>
                  <td><span class="mono">{{ it.type }}</span></td>
                  <td>{{ it.to_email }}</td>
                  <td>
                    <div class="subject">{{ it.subject }}</div>
                    @if (it.status === 'failed' && it.error_message) {
                      <div class="small errtxt">{{ it.error_message }}</div>
                    }
                  </td>
                  <td><span class="pill" [class]="it.status">{{ it.status }}</span></td>
                  <td class="muted">{{ it.sent_at || it.created_at || '—' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>

        <div class="pager">
          <button class="btn" (click)="prev()" [disabled]="page() <= 1 || loading()">{{ 'COMMON.PREVIOUS' | translate }}</button>
          <div class="muted">{{ 'COMMON.PAGE_OF' | translate:{ page: page(), total: lastPage() } }}</div>
          <button class="btn" (click)="next()" [disabled]="page() >= lastPage() || loading()">{{ 'COMMON.NEXT' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .head { display:flex; align-items:flex-start; justify-content:space-between; gap: 1rem; margin-bottom: 1rem; }
    .muted { color:#6b7280; margin:.25rem 0 0; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden; }
    .filters { display:grid; grid-template-columns: 1fr 1fr 2fr auto; gap: .75rem; padding: 12px 12px; margin-bottom: 1rem; align-items:end; }
    .field { display:flex; flex-direction:column; gap:.35rem; font-weight: 750; font-size: .9rem; }
    input, select { border: 1px solid #d1d5db; border-radius: 10px; padding: .55rem .6rem; font: inherit; }
    table { width:100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; text-align:left; vertical-align: top; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
    .subject { font-weight: 800; }
    .small { font-size: .82rem; }
    .errtxt { color:#991b1b; margin-top: 4px; }
    .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background:#f3f4f6; text-transform: lowercase; }
    .pill.sent { background:#ecfdf5; color:#065f46; }
    .pill.failed { background:#fef2f2; color:#991b1b; }
    .pill.skipped { background:#f8fafc; color:#334155; }
    .btn { padding: 6px 10px; border: 1px solid #d1d5db; background: #fff; border-radius: 10px; cursor: pointer; font-weight: 750; }
    .btn.primary { background:#0f766e; border-color:#0f766e; color:#fff; }
    .error { padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 12px; margin-bottom: 1rem; }
    .pager { display:flex; justify-content:space-between; align-items:center; gap: 1rem; padding: 12px 12px; }
    @media (max-width: 900px) { .filters { grid-template-columns: 1fr; } }
  `],
})
export class EmailLogsComponent {
  items = signal<EmailLog[]>([]);
  loading = signal(false);
  error = signal('');
  page = signal(1);
  lastPage = signal(1);

  type = '';
  status = '';
  toEmail = '';

  constructor(private emails: EmailLogService) {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.emails.list({
      page: this.page(),
      per_page: 20,
      type: this.type || undefined,
      status: this.status || undefined,
      to_email: this.toEmail?.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.items.set(res.data || []);
        this.lastPage.set(res.last_page || 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Failed to load email logs.');
      },
    });
  }

  prev(): void {
    if (this.page() <= 1) return;
    this.page.set(this.page() - 1);
    this.load();
  }
  next(): void {
    if (this.page() >= this.lastPage()) return;
    this.page.set(this.page() + 1);
    this.load();
  }
}

