import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { map, startWith } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { ApiService } from '../core/services/api.service';
import { getSidebarItems, type AppRole, type SidebarItem } from './sidebar.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sb" [class.collapsed]="collapsed()">
      <div class="sb-top">
        <div class="brand">
          <img class="logo" src="assets/smart-fleet-logo.png" alt="Smart Fleet" />
          <span class="brand-txt">SMART FLEET</span>
        </div>

        <div class="profile">
          <div class="avatar" aria-hidden="true">{{ initials() }}</div>
          <div class="meta" *ngIf="!collapsed()">
            <div class="name">{{ displayName() }}</div>
            <div class="role">{{ displayRole() | translate }}</div>
          </div>
        </div>

        <button class="collapse-btn" type="button" (click)="toggle()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav class="sb-nav">
        @for (it of visibleItems(); track it.key) {
          @if (!collapsed() && sectionTitle(it)) {
            <div class="sb-section" role="presentation">{{ sectionTitle(it)! | translate }}</div>
          }
          <a
            class="sb-link"
            [routerLink]="it.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: !!it.exact }"
            [title]="(it.labelKey | translate)"
          >
            <span class="ic" aria-hidden="true" [innerHTML]="iconSvg(it.icon)"></span>
            <span class="txt" *ngIf="!collapsed()">{{ it.labelKey | translate }}</span>

            @if (!collapsed() && it.badge?.type === 'count') {
              <span class="badge" *ngIf="(badgeCount(it) | async) as n" [class.hidden]="n <= 0">{{ n }}</span>
            }
          </a>
        }
      </nav>
    </aside>
  `,
  styles: [`
    .sb {
      width: 260px;
      min-height: calc(100vh - 56px);
      background: linear-gradient(180deg, rgba(15,118,110,.90) 0%, rgba(11,79,74,.68) 100%);
      border-right: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.92);
      display:flex;
      flex-direction:column;
      position: relative;
      transition: width .18s ease;
    }
    .sb.collapsed { width: 86px; }
    .sb-top { padding: .9rem .95rem .75rem; border-bottom: 1px solid rgba(255,255,255,0.10); position: relative; }
    .brand { display:flex; align-items:center; gap: .55rem; }
    .logo { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.9); padding: 4px; }
    .brand-txt { font-weight: 900; letter-spacing: .10em; font-size: .92rem; }
    .sb.collapsed .brand-txt { display:none; }

    .profile { margin-top: .75rem; display:flex; align-items:center; gap: .6rem; padding: .55rem .6rem; border-radius: 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
    .avatar { width: 34px; height: 34px; border-radius: 14px; display:grid; place-items:center; background: rgba(255,255,255,0.94); color:#0f766e; font-weight: 900; }
    .meta { min-width: 0; }
    .name { font-weight: 850; font-size: .9rem; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role { font-size: .74rem; color: rgba(255,255,255,0.72); margin-top: .12rem; }

    .collapse-btn {
      position:absolute; right: .85rem; top: .95rem;
      width: 34px; height: 34px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.92);
      cursor:pointer;
    }
    .collapse-btn:hover { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
    .collapse-btn svg { width: 18px; height: 18px; }
    .sb.collapsed .collapse-btn svg { transform: rotate(180deg); }

    .sb-nav { padding: .75rem 0; display:flex; flex-direction:column; gap: .15rem; }
    .sb-section {
      padding: .65rem .95rem .35rem;
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
      border-top: 1px solid rgba(255,255,255,0.10);
      margin-top: .25rem;
    }
    .sb-nav > .sb-section:first-of-type { border-top: 0; margin-top: 0; }
    .sb-link {
      display:flex; align-items:center; gap: .65rem;
      padding: .55rem .95rem;
      color: rgba(255,255,255,0.90);
      text-decoration:none;
      border-left: 3px solid transparent;
      transition: background .12s ease, border-color .12s ease;
    }
    .sb-link:hover { background: rgba(255,255,255,0.10); }
    .sb-link.active { background: rgba(255,255,255,0.15); border-left-color: rgba(255,255,255,0.85); }
    .ic { width: 18px; height: 18px; display:inline-grid; place-items:center; opacity: .95; }
    .ic :global(svg) { width: 18px; height: 18px; }
    .txt { font-weight: 700; font-size: .92rem; }
    .badge {
      margin-left: auto;
      min-width: 22px;
      height: 18px;
      padding: 0 6px;
      border-radius: 999px;
      display:inline-grid;
      place-items:center;
      font-size: 12px;
      background: rgba(244,63,94,.95);
      color:#fff;
      box-shadow: 0 12px 20px rgba(244,63,94,.22);
    }
    .badge.hidden { display:none; }
    .sb.collapsed .sb-link { justify-content:center; padding-left: 0; padding-right: 0; }
  `],
})
export class SidebarComponent {
  collapsed = signal(false);

  private readonly alertsCount$ = this.api.get<{ count: number; alerts: unknown[] }>('/alerts').pipe(
    map((r) => r.count ?? 0),
    startWith(0),
  );

  private readonly items = getSidebarItems({ alertsCount$: this.alertsCount$ });

  visibleItems = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (!role) return [];
    return this.items.filter((i) => i.roles.includes(role as any));
  });

  constructor(
    private auth: AuthService,
    private api: ApiService,
  ) {}

  toggle(): void {
    this.collapsed.set(!this.collapsed());
  }

  displayName(): string {
    const n = this.auth.currentUser()?.name;
    return n && n !== 'null' ? n : 'Utilisateur';
  }

  initials(): string {
    const n = this.displayName().trim();
    return (n[0] || 'U').toUpperCase();
  }

  displayRole(): string {
    const r = this.auth.currentUser()?.role;
    if (r === 'admin') return 'HEADER.ROLE_ADMIN';
    if (r === 'gestionnaire') return 'HEADER.ROLE_GESTIONNAIRE';
    if (r === 'chauffeur') return 'HEADER.ROLE_CHAUFFEUR';
    return 'HEADER.ROLE_USER';
  }

  /** Titre de section optionnel (ex. libellé Gestionnaire dans le menu). */
  sectionTitle(it: SidebarItem): string | null {
    const role = this.auth.currentUser()?.role as AppRole | undefined;
    if (!it.sectionLabelKey || !it.sectionForRoles?.length || !role) return null;
    return it.sectionForRoles.includes(role) ? it.sectionLabelKey : null;
  }

  badgeCount(it: SidebarItem) {
    return it.badge?.type === 'count' ? it.badge.value$ : undefined;
  }

  iconSvg(name: SidebarItem['icon']): string {
    // Heroicon-like inline SVGs (no external deps).
    const common = `fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;
    switch (name) {
      case 'dashboard':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M3 3v18h18"/><path d="M7 14v4"/><path d="M12 10v8"/><path d="M17 6v12"/></svg>`;
      case 'vehicle':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M3 16l1-4 2-6h12l2 6 1 4"/><path d="M6 12h12"/><path d="M7 16a2 2 0 0 0 4 0"/><path d="M13 16a2 2 0 0 0 4 0"/></svg>`;
      case 'drivers':
      case 'users':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M20 21a8 8 0 0 0-16 0"/><path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>`;
      case 'missions':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
      case 'maintenance':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M14.7 6.3a1 1 0 0 0-1.4 0l-7.1 7.1a2 2 0 0 0-.5 1.9l.3 1.1 1.1.3a2 2 0 0 0 1.9-.5l7.1-7.1a1 1 0 0 0 0-1.4Z"/><path d="M15 7l2-2"/><path d="M19 11l2-2"/></svg>`;
      case 'fuel':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M3 22h10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z"/><path d="M7 9h2"/><path d="M13 13h2a2 2 0 0 0 2-2V6l-2-2"/><path d="M17 6h1a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3h-1"/></svg>`;
      case 'alerts':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
      case 'trajets':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M3 6h5l1 2h12"/><path d="M7 18h.01"/><path d="M17 18h.01"/><path d="M5 16l-1-5h16l-1 5"/><path d="M6 16h12"/></svg>`;
      case 'incident':
        return `<svg viewBox="0 0 24 24" ${common}><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z"/></svg>`;
      case 'fleet':
        return `<svg viewBox="0 0 24 24" ${common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M7 18l2-3h6l2 3"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" ${common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
    }
  }
}

