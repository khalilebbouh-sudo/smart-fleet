import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

type Role = 'user' | 'gestionnaire' | 'chauffeur' | 'admin';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>{{ 'ADMIN.USER_MANAGEMENT_TITLE' | translate }}</h2>
        </div>
        <button class="btn" (click)="load()" [disabled]="loading()">{{ 'ADMIN.REFRESH' | translate }}</button>
      </div>

      @if (lastAction()) {
        <div class="ok">{{ lastAction() }}</div>
      }

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="muted">{{ 'ADMIN.LOADING' | translate }}</div>
      } @else {
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th class="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>{{ u.id }}</td>
                  <td>{{ u.name }}</td>
                  <td>{{ u.email }}</td>
                  <td><span class="pill">{{ u.role }}</span></td>
                  <td class="actions">
                    @if (isAdmin()) {
                      <button
                        class="icon-btn btn-gest"
                        type="button"
                        (click)="makeGestionnaire(u)"
                        [disabled]="roleChangeDisabled(u)"
                        [title]="'ADMIN.MAKE_GESTIONNAIRE' | translate"
                        [attr.aria-label]="'ADMIN.MAKE_GESTIONNAIRE' | translate"
                      >
                        <span class="ic" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21a8 8 0 0 0-16 0" />
                            <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                            <path d="M19 8v6" />
                            <path d="M16 11h6" />
                          </svg>
                        </span>
                      </button>

                      <button
                        class="icon-btn btn-chauf"
                        type="button"
                        (click)="makeChauffeur(u)"
                        [disabled]="roleChangeDisabled(u)"
                        [title]="'ADMIN.MAKE_CHAUFFEUR' | translate"
                        [attr.aria-label]="'ADMIN.MAKE_CHAUFFEUR' | translate"
                      >
                        <span class="ic" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 16l1-4 2-6h12l2 6 1 4" />
                            <path d="M6 12h12" />
                            <path d="M7 16a2 2 0 0 0 4 0" />
                            <path d="M13 16a2 2 0 0 0 4 0" />
                            <path d="M5 8h2" />
                          </svg>
                        </span>
                      </button>

                      <button
                        class="icon-btn btn-reset"
                        type="button"
                        (click)="resetToUser(u)"
                        [disabled]="roleChangeDisabled(u)"
                        [title]="'ADMIN.REMOVE_GESTIONNAIRE' | translate"
                        [attr.aria-label]="'ADMIN.REMOVE_GESTIONNAIRE' | translate"
                      >
                        <span class="ic" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 1 0 3-6.7" />
                            <path d="M3 3v6h6" />
                          </svg>
                        </span>
                      </button>

                      <button
                        class="icon-btn danger"
                        type="button"
                        (click)="deleteUser(u)"
                        [disabled]="deleteDisabled(u)"
                        [title]="'ADMIN.DELETE_USER' | translate"
                        [attr.aria-label]="'ADMIN.DELETE_USER' | translate"
                      >
                        <span class="ic" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M6 6l1 16h10l1-16" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </span>
                      </button>
                    } @else {
                      —
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .head { display:flex; align-items:flex-start; justify-content:space-between; gap: 1rem; margin-bottom: 1rem; }
    h2 { margin: 0; }
    .muted { color: #6b7280; margin: .25rem 0 0; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; text-align: left; }
    th.actions, td.actions { width: 260px; }
    .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #f3f4f6; }
    .icon-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      border: 1px solid #d1d5db;
      background: #fff;
      border-radius: 10px;
      cursor: pointer;
      margin-right: 8px;
      display: inline-grid;
      place-items: center;
    }
    .icon-btn:hover { transform: translateY(-1px); }
    .ic { width: 18px; height: 18px; display: inline-grid; place-items: center; }
    .ic svg { width: 18px; height: 18px; }
    .btn-gest { border-color: rgba(14,116,144,.35); background: rgba(14,116,144,.10); color: #155e75; }
    .btn-gest:hover { background: rgba(14,116,144,.16); }
    .btn-chauf { border-color: rgba(124,58,237,.30); background: rgba(124,58,237,.10); color: #5b21b6; }
    .btn-chauf:hover { background: rgba(124,58,237,.16); }
    .btn-reset { border-color: rgba(107,114,128,.30); background: rgba(107,114,128,.10); color: #374151; }
    .btn-reset:hover { background: rgba(107,114,128,.16); }
    .danger { border-color: rgba(244,63,94,.35); background: rgba(244,63,94,.08); color: #991b1b; }
    .danger:hover { background: rgba(244,63,94,.12); }
    .icon-btn[disabled] { opacity: .55; cursor: not-allowed; transform: none; }
    .error { padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 12px; margin-bottom: 1rem; }
    .ok { padding: 10px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 12px; margin-bottom: 1rem; }
  `],
})
export class UserManagementComponent {
  users = signal<UserRow[]>([]);
  loading = signal(false);
  error = signal<string>('');
  lastAction = signal<string>('');

  isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {
    this.load();
  }

  load(): void {
    if (!this.isAdmin()) {
      this.error.set('Forbidden');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.lastAction.set('');
    this.api.get<{ data: UserRow[] }>('/users').subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status ? `HTTP ${err.status}` : '';
        this.error.set(`${status} ${err?.error?.message || 'Failed to load users.'}`.trim());
      },
    });
  }

  private isSelf(u: UserRow): boolean {
    return u.id === this.auth.currentUser()?.id;
  }

  roleChangeDisabled(u: UserRow): boolean {
    // Only admin can change roles, and admin cannot change himself or any admin.
    return !this.isAdmin() || u.role === 'admin' || this.isSelf(u);
  }

  deleteDisabled(u: UserRow): boolean {
    // Only admin can delete users, and admin cannot delete himself or any admin.
    return !this.isAdmin() || u.role === 'admin' || this.isSelf(u);
  }

  makeGestionnaire(u: UserRow): void {
    if (this.roleChangeDisabled(u)) return;
    const ok = confirm(`Make user #${u.id} (${u.email}) a gestionnaire?`);
    if (!ok) return;
    this.loading.set(true);
    this.error.set('');
    this.api.post(`/users/${u.id}/make-gestionnaire`, {}).subscribe({
      next: () => {
        this.users.set(this.users().map(x => (x.id === u.id ? { ...x, role: 'gestionnaire' } : x)));
        this.lastAction.set(`User #${u.id} promoted.`);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status ? `HTTP ${err.status}` : '';
        this.error.set(`${status} ${err?.error?.message || 'Action failed.'}`.trim());
      },
    });
  }

  removeGestionnaire(u: UserRow): void {
    if (this.roleChangeDisabled(u)) return;
    const ok = confirm(`Set user #${u.id} (${u.email}) back to user?`);
    if (!ok) return;
    this.loading.set(true);
    this.error.set('');
    this.api.post(`/users/${u.id}/remove-gestionnaire`, {}).subscribe({
      next: () => {
        this.users.set(this.users().map(x => (x.id === u.id ? { ...x, role: 'user' } : x)));
        this.lastAction.set(`User #${u.id} demoted.`);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status ? `HTTP ${err.status}` : '';
        this.error.set(`${status} ${err?.error?.message || 'Action failed.'}`.trim());
      },
    });
  }

  makeChauffeur(u: UserRow): void {
    if (this.roleChangeDisabled(u)) return;
    const ok = confirm(`Make user #${u.id} (${u.email}) a chauffeur?`);
    if (!ok) return;
    this.loading.set(true);
    this.error.set('');
    this.api.post(`/users/${u.id}/make-chauffeur`, {}).subscribe({
      next: () => {
        this.users.set(this.users().map(x => (x.id === u.id ? { ...x, role: 'chauffeur' } : x)));
        this.lastAction.set(`User #${u.id} set as chauffeur.`);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status ? `HTTP ${err.status}` : '';
        this.error.set(`${status} ${err?.error?.message || 'Action failed.'}`.trim());
      },
    });
  }

  deleteUser(u: UserRow): void {
    if (this.deleteDisabled(u)) return;
    const ok = confirm(`Delete user #${u.id} (${u.email})?`);
    if (!ok) return;

    this.loading.set(true);
    this.error.set('');
    this.api.delete(`/users/${u.id}`).subscribe({
      next: () => {
        this.users.set(this.users().filter(x => x.id !== u.id));
        this.lastAction.set(`User #${u.id} deleted.`);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status ? `HTTP ${err.status}` : '';
        this.error.set(`${status} ${err?.error?.message || 'Delete failed.'}`.trim());
      },
    });
  }

  // Alias to keep UI wording simple: reset to "user"
  resetToUser(u: UserRow): void {
    return this.removeGestionnaire(u);
  }
}

