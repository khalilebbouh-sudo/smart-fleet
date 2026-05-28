import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../core/services/language.service';
import { NotificationService } from '../core/services/notification.service';
import { ApiService } from '../core/services/api.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sf-shell">
      <header class="sf-topbar">
        <div class="tb-left">
          <input id="sbToggle" class="sb-toggle" type="checkbox" aria-label="Toggle sidebar" />
          <label class="icon-btn" for="sbToggle" title="Collapse sidebar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </label>

          <div class="tb-search">
            <span class="s-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="M21 21l-4.3-4.3"></path>
              </svg>
            </span>
            <input
              class="s-input"
              type="search"
              [value]="search"
              (input)="search = $any($event.target).value"
              [placeholder]="'HEADER.SEARCH_PLACEHOLDER' | translate"
              [attr.aria-label]="'HEADER.SEARCH' | translate"
            />
            @if (search) {
              <button type="button" class="s-clear" (click)="search = ''" aria-label="Clear search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6L6 18"></path>
                  <path d="M6 6l12 12"></path>
                </svg>
              </button>
            }
          </div>
        </div>

        <div class="tb-right">
          <div class="tb-date">
            <button type="button" class="chip" (click)="isDateOpen = !isDateOpen" aria-label="Date selector">
              <span class="chip-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="3"></rect>
                  <path d="M16 2v4M8 2v4M3 10h18"></path>
                </svg>
              </span>
              <span class="chip-txt">{{ selectedDateLabel }}</span>
              <span class="chip-caret" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </button>
            @if (isDateOpen) {
              <div class="date-pop" (click)="$event.stopPropagation()">
                <input class="date-input" type="date" [value]="selectedDate" (change)="onDateChange($any($event.target).value)" />
              </div>
            }
          </div>

          @if (notif.isEnabled()) {
            <div class="notif">
              <button type="button" class="icon-btn" (click)="toggleNotif()" title="Notifications" aria-label="Notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                @if (notif.unreadCount() > 0) {
                  <span class="dot">{{ notif.unreadCount() }}</span>
                }
              </button>
              @if (notifOpen) {
                <div class="notif-panel" (click)="$event.stopPropagation()">
                  <div class="notif-header">
                    <span class="notif-title">Notifications</span>
                    <button type="button" class="btn-link" (click)="notif.markAllRead()">Mark all read</button>
                  </div>
                  <div class="notif-list">
                    @if (notif.items().length === 0) {
                      <div class="notif-empty">No notifications</div>
                    } @else {
                      @for (n of notif.items(); track n.id ?? n.data.created_at) {
                        <button type="button" class="notif-item" [class.unread]="!n.read_at" (click)="openNotif(n)">
                          <div class="notif-item-title">{{ n.data.title }}</div>
                          <div class="notif-item-msg">{{ n.data.message }}</div>
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          }

          <div class="tb-profile">
            <div class="p-avatar" aria-hidden="true">
              <span class="p-initial">{{
                (((auth.currentUser()?.name && auth.currentUser()?.name !== 'null') ? auth.currentUser()?.name : 'Utilisateur') || 'U')
                  .charAt(0)
                  .toUpperCase()
              }}</span>
            </div>
            <div class="p-meta">
              <div class="p-name">{{ (auth.currentUser()?.name && auth.currentUser()?.name !== 'null') ? auth.currentUser()?.name : 'Utilisateur' }}</div>
              <div class="p-role">{{
                auth.currentUser()?.role === 'admin'
                  ? ('HEADER.ROLE_ADMIN' | translate)
                  : auth.currentUser()?.role === 'gestionnaire'
                    ? ('HEADER.ROLE_GESTIONNAIRE' | translate)
                    : auth.currentUser()?.role === 'chauffeur'
                      ? ('HEADER.ROLE_CHAUFFEUR' | translate)
                      : ('HEADER.ROLE_USER' | translate)
              }}</div>
            </div>
          </div>

          <button type="button" class="ghost" (click)="lang.toggle()">
            {{ lang.lang() === 'fr' ? ('HEADER.LANG_FR' | translate) : ('HEADER.LANG_EN' | translate) }}
          </button>
          <button type="button" class="primary" (click)="auth.logout()">{{ 'HEADER.LOGOUT' | translate }}</button>
        </div>
      </header>

      <aside class="sf-sidebar" aria-label="Sidebar">
        <a class="sb-brand" routerLink="/dashboard" aria-label="Smart Fleet">
          <img class="sb-logo" src="assets/smart-fleet-logo.png" alt="Smart Fleet logo" />
            <div class="sb-wordmark">
            <div class="sb-name">SMART FLEET</div>
            <div class="sb-sub">{{ 'LAYOUT.FLEET_SUBTITLE' | translate }}</div>
          </div>
        </a>

        <nav class="sf-nav" aria-label="Main navigation">
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="erp-nav-link">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 14v4" />
                <path d="M12 10v8" />
                <path d="M17 6v12" />
              </svg>
            </span>
            {{ 'NAV.DASHBOARD' | translate }}
          </a>

          @if (auth.currentUser()?.role === 'admin' || auth.currentUser()?.role === 'gestionnaire') {
            <a routerLink="/vehicles" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 16l1-4 2-6h12l2 6 1 4" />
                <path d="M6 12h12" />
                <path d="M7 16a2 2 0 0 0 4 0" />
                <path d="M13 16a2 2 0 0 0 4 0" />
              </svg>
            </span>
            {{ 'NAV.VEHICLES' | translate }}
            </a>
          }

          @if (auth.isAdmin()) {
            <a routerLink="/drivers" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                </svg>
              </span>
              {{ 'NAV.DRIVERS' | translate }}
            </a>
          }

          <!-- Just added: Missions -->
          @if (auth.currentUser()?.role === 'admin' || auth.currentUser()?.role === 'gestionnaire') {
            <a routerLink="/missions" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              {{ 'NAV.MISSIONS' | translate }}
            </a>

            <a routerLink="/fleet/live" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10Z" />
                  <circle cx="12" cy="11" r="2.5" />
                </svg>
              </span>
              {{ 'NAV.FLEET_LIVE' | translate }}
              <span class="nav-badge nav-badge-live">Live</span>
            </a>
          }

          @if (auth.currentUser()?.role === 'admin' || auth.currentUser()?.role === 'gestionnaire') {
            <a routerLink="/maintenances" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0-1.4 0l-7.1 7.1a2 2 0 0 0-.5 1.9l.3 1.1 1.1.3a2 2 0 0 0 1.9-.5l7.1-7.1a1 1 0 0 0 0-1.4Z" />
                <path d="M15 7l2-2" />
                <path d="M19 11l2-2" />
              </svg>
            </span>
            {{ 'NAV.MAINTENANCE' | translate }}
            </a>
          }

          @if (auth.currentUser()?.role === 'admin' || auth.currentUser()?.role === 'gestionnaire') {
            <a routerLink="/fuel" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 22h10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
                <path d="M7 9h2" />
                <path d="M13 13h2a2 2 0 0 0 2-2V6l-2-2" />
                <path d="M17 6h1a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3h-1" />
              </svg>
            </span>
            {{ 'NAV.FUEL' | translate }}
            </a>
          }

          @if (auth.currentUser()?.role === 'admin' || auth.currentUser()?.role === 'gestionnaire') {
            <a routerLink="/alerts" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            {{ 'NAV.ALERTS' | translate }}
            @if (alertsCount() > 0) {
              <span class="nav-badge nav-badge-alert">{{ alertsCount() > 99 ? '99+' : alertsCount() }}</span>
            }
            </a>
          }

          @if (auth.currentUser()?.role === 'admin' || auth.currentUser()?.role === 'gestionnaire') {
            <a routerLink="/email-logs" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16v16H4z" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
              </span>
              {{ 'NAV.EMAIL_LOGS' | translate }}
            </a>
          }

          @if (auth.currentUser()?.role === 'chauffeur') {
            <a routerLink="/my-missions" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              {{ 'NAV.MY_MISSIONS' | translate }}
            </a>

            <a routerLink="/trajets" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h5l1 2h12" />
                  <path d="M5 16l-1-5h16l-1 5" />
                  <path d="M7 18h.01" />
                  <path d="M17 18h.01" />
                </svg>
              </span>
              {{ 'NAV.TRAJETS' | translate }}
            </a>

            <a routerLink="/incidents" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </span>
              {{ 'NAV.INCIDENTS' | translate }}
            </a>
          }

          <a *ngIf="auth.currentUser()?.role === 'admin'" routerLink="/admin/users" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              </svg>
            </span>
            {{ 'NAV.USER_MANAGEMENT' | translate }}
          </a>
        </nav>

        <div class="sb-footer glass-foot" aria-label="System status">
          <div class="sf-row">
            <span class="sf-pulse" aria-hidden="true"></span>
            <div>
              <div class="sf-title">{{ 'LAYOUT.SYSTEM_STATUS' | translate }}</div>
              <div class="sf-sub">{{ 'LAYOUT.SYSTEM_ONLINE' | translate }}</div>
            </div>
          </div>
          <div class="sf-spark" aria-hidden="true">
            <svg viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 24 L22 18 L38 22 L54 10 L70 16 L86 8 L102 14 L118 6" stroke="url(#g1)" stroke-width="2" stroke-linecap="round" />
              <defs><linearGradient id="g1" x1="0" y1="0" x2="120" y2="0"><stop stop-color="#22c55e"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs>
            </svg>
          </div>
        </div>
      </aside>

      <main class="sf-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .sf-shell {
      --bg0: #070b14;
      --bg1: rgba(9, 14, 28, 0.88);
      --stroke: rgba(148, 163, 184, 0.16);
      --stroke2: rgba(148, 163, 184, 0.10);
      --text: rgba(226, 232, 240, 0.95);
      --muted: rgba(148, 163, 184, 0.82);
      --accent: #38bdf8;
      --accent2: #22c55e;
      --danger: #fb7185;
      --warn: #fbbf24;
      --shadow: 0 26px 80px rgba(0,0,0,.55);
      --shadow2: 0 16px 48px rgba(0,0,0,.45);
      --radius: 18px;
      min-height: 100vh;
      background:
        radial-gradient(1200px 600px at 20% -20%, rgba(56, 189, 248, 0.20), transparent 55%),
        radial-gradient(900px 500px at 90% 10%, rgba(99, 102, 241, 0.18), transparent 52%),
        radial-gradient(900px 600px at 70% 120%, rgba(34, 197, 94, 0.12), transparent 55%),
        var(--bg0);
      color: var(--text);
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      grid-template-rows: 72px minmax(0, 1fr);
      grid-template-areas:
        "sidebar topbar"
        "sidebar main";
    }

    .sf-topbar {
      grid-area: topbar;
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1.1rem;
      background: linear-gradient(180deg, rgba(9, 14, 28, 0.92), rgba(9, 14, 28, 0.72));
      border-bottom: 1px solid var(--stroke2);
      backdrop-filter: blur(10px);
    }

    .tb-left { display:flex; align-items:center; gap: .85rem; min-width: 0; }
    .tb-right { display:flex; align-items:center; justify-content:flex-end; gap: .7rem; min-width: 0; }
    .sb-toggle { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

    .icon-btn {
      width: 42px; height: 42px;
      border-radius: 14px;
      border: 1px solid var(--stroke);
      background: rgba(255,255,255,0.04);
      color: rgba(226,232,240,0.92);
      display: inline-grid;
      place-items: center;
      box-shadow: 0 14px 30px rgba(0,0,0,.30);
      transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
      cursor: pointer;
    }
    .icon-btn:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.35); box-shadow: 0 18px 44px rgba(0,0,0,.45); }
    .icon-btn svg { width: 18px; height: 18px; }

    .tb-search {
      flex: 1;
      min-width: 240px;
      max-width: 720px;
      display:flex;
      align-items:center;
      gap: .55rem;
      padding: .55rem .75rem;
      border-radius: 16px;
      border: 1px solid var(--stroke);
      background: rgba(255,255,255,0.03);
      box-shadow: 0 18px 48px rgba(0,0,0,.32);
      backdrop-filter: blur(10px);
    }
    .s-ic { width: 18px; height: 18px; display:inline-grid; place-items:center; color: rgba(148,163,184,.95); }
    .s-ic svg { width: 18px; height: 18px; }
    .s-input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: rgba(226,232,240,.95);
      font-size: .93rem;
      letter-spacing: .01em;
    }
    .s-input::placeholder { color: rgba(148,163,184,.72); }
    .s-clear {
      width: 28px; height: 28px;
      border-radius: 10px;
      border: 1px solid rgba(148,163,184,.14);
      background: rgba(255,255,255,0.04);
      color: rgba(148,163,184,.9);
      display:inline-grid;
      place-items:center;
      cursor: pointer;
      transition: transform .14s ease, border-color .14s ease;
    }
    .s-clear:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.35); }
    .s-clear svg { width: 14px; height: 14px; }

    .tb-date { position: relative; }
    .chip {
      display:inline-flex;
      align-items:center;
      gap: .55rem;
      height: 42px;
      padding: 0 .75rem;
      border-radius: 14px;
      border: 1px solid var(--stroke);
      background: rgba(255,255,255,0.04);
      color: rgba(226,232,240,0.92);
      box-shadow: 0 14px 30px rgba(0,0,0,.30);
      cursor: pointer;
      transition: transform .14s ease, border-color .14s ease;
      user-select: none;
    }
    .chip:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.35); }
    .chip-ic { width: 18px; height: 18px; display:inline-grid; place-items:center; color: rgba(56,189,248,.95); }
    .chip-ic svg { width: 18px; height: 18px; }
    .chip-txt { font-weight: 800; font-size: .86rem; letter-spacing: .02em; }
    .chip-caret { width: 14px; height: 14px; display:inline-grid; place-items:center; color: rgba(148,163,184,.85); }
    .chip-caret svg { width: 14px; height: 14px; }
    .date-pop {
      position: absolute;
      right: 0;
      top: 52px;
      padding: .65rem;
      border-radius: 16px;
      border: 1px solid var(--stroke);
      background: rgba(9, 14, 28, 0.82);
      backdrop-filter: blur(10px);
      box-shadow: var(--shadow2);
      z-index: 60;
    }
    .date-input {
      height: 42px;
      border-radius: 12px;
      border: 1px solid rgba(148,163,184,.16);
      background: rgba(255,255,255,0.03);
      color: rgba(226,232,240,.92);
      padding: 0 .7rem;
      outline: none;
    }

    .notif { position: relative; }
    .dot {
      position: absolute;
      top: -5px; right: -5px;
      min-width: 18px; height: 18px;
      padding: 0 6px;
      border-radius: 999px;
      background: radial-gradient(circle at 30% 30%, rgba(56,189,248,.95), rgba(59,130,246,.95));
      color: #020617;
      font-weight: 900;
      font-size: 11px;
      display: grid;
      place-items: center;
      border: 2px solid rgba(9,14,28,.98);
      box-shadow: 0 10px 28px rgba(56,189,248,.35);
    }
    .notif-panel {
      position: absolute;
      right: 0;
      top: 52px;
      width: 340px;
      background: rgba(9, 14, 28, 0.82);
      border: 1px solid var(--stroke);
      border-radius: 18px;
      box-shadow: var(--shadow2);
      overflow: hidden;
      z-index: 50;
      backdrop-filter: blur(12px);
    }
    .notif-header { display:flex; align-items:center; justify-content: space-between; padding: .85rem .95rem; border-bottom: 1px solid rgba(148,163,184,.12); }
    .notif-title { font-weight: 900; color: rgba(226,232,240,.96); letter-spacing: .01em; }
    .btn-link { border: none; background: transparent; color: rgba(56,189,248,.95); font-weight: 800; cursor: pointer; font-size: .78rem; }
    .notif-list { max-height: 360px; overflow: auto; }
    .notif-empty { padding: 1rem; color: rgba(148,163,184,.86); font-size: .9rem; }
    .notif-item { width: 100%; text-align:left; border: none; background: transparent; padding: .78rem .95rem; cursor: pointer; border-bottom: 1px solid rgba(148,163,184,.10); }
    .notif-item.unread { background: rgba(56,189,248,.06); }
    .notif-item-title { font-weight: 900; font-size: .85rem; color: rgba(226,232,240,.96); }
    .notif-item-msg { font-size: .82rem; color: rgba(148,163,184,.86); margin-top: .15rem; }

    .tb-profile { display:flex; align-items:center; gap: .65rem; padding: .4rem .55rem; border-radius: 16px; border: 1px solid rgba(148,163,184,.12); background: rgba(255,255,255,0.03); }
    .p-avatar { width: 38px; height: 38px; border-radius: 14px; display:grid; place-items:center; background: radial-gradient(circle at 30% 30%, rgba(56,189,248,.34), rgba(99,102,241,.22)); border: 1px solid rgba(56,189,248,.20); box-shadow: 0 18px 46px rgba(56,189,248,.18); }
    .p-initial { font-weight: 950; color: rgba(226,232,240,.96); letter-spacing: .02em; }
    .p-meta { display:flex; flex-direction:column; line-height: 1.05; }
    .p-name { font-weight: 900; font-size: .86rem; color: rgba(226,232,240,.96); max-width: 150px; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
    .p-role { font-size: .74rem; color: rgba(148,163,184,.86); text-transform: capitalize; }

    .ghost, .primary {
      height: 42px;
      padding: 0 .9rem;
      border-radius: 14px;
      border: 1px solid rgba(148,163,184,.16);
      background: rgba(255,255,255,0.03);
      color: rgba(226,232,240,.92);
      font-weight: 900;
      font-size: .82rem;
      letter-spacing: .02em;
      cursor: pointer;
      transition: transform .14s ease, border-color .14s ease, box-shadow .14s ease;
      box-shadow: 0 14px 32px rgba(0,0,0,.30);
    }
    .ghost:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.35); }
    .primary {
      border-color: rgba(56,189,248,.28);
      background: linear-gradient(135deg, rgba(56,189,248,.22), rgba(59,130,246,.14));
      box-shadow: 0 18px 52px rgba(56,189,248,.10);
    }
    .primary:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.48); box-shadow: 0 22px 60px rgba(56,189,248,.16); }

    .sf-sidebar {
      grid-area: sidebar;
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 1rem .85rem;
      border-right: 1px solid var(--stroke2);
      background: linear-gradient(180deg, rgba(9,14,28,.92), rgba(9,14,28,.70));
      backdrop-filter: blur(10px);
      display:flex;
      flex-direction: column;
      gap: 1rem;
    }
    .sb-brand {
      display:flex;
      align-items:center;
      gap: .75rem;
      padding: .65rem .65rem;
      border-radius: 18px;
      border: 1px solid rgba(148,163,184,.14);
      background: rgba(255,255,255,0.03);
      text-decoration: none;
      box-shadow: 0 18px 56px rgba(0,0,0,.38);
    }
    .sb-logo { width: 38px; height: 38px; object-fit: contain; filter: drop-shadow(0 18px 26px rgba(56,189,248,.10)); }
    .sb-wordmark { min-width: 0; display:flex; flex-direction:column; gap: .12rem; }
    .sb-name { font-weight: 950; letter-spacing: .12em; font-size: .86rem; color: rgba(226,232,240,.96); }
    .sb-sub { font-size: .74rem; color: rgba(148,163,184,.82); }

    .sf-nav { flex: 1; display:flex; flex-direction:column; gap: .15rem; padding-top: .2rem; min-height: 0; overflow: auto; }
    .nav-badge {
      margin-left: auto;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,.2);
      flex-shrink: 0;
    }
    .nav-badge-live {
      color: rgba(167, 139, 250, 0.98);
      border-color: rgba(167, 139, 250, 0.35);
      background: rgba(167, 139, 250, 0.1);
      box-shadow: 0 0 20px rgba(167, 139, 250, 0.15);
    }
    .nav-badge-alert {
      min-width: 22px;
      text-align: center;
      color: rgba(254, 202, 202, 0.98);
      border-color: rgba(251, 113, 133, 0.45);
      background: rgba(251, 113, 133, 0.14);
    }
    .sb-footer {
      margin-top: auto;
      padding: 0.75rem 0.65rem;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(255, 255, 255, 0.03);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
    }
    .sf-row { display: flex; align-items: center; gap: 0.55rem; }
    .sf-pulse {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.95);
      box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12), 0 0 24px rgba(34, 197, 94, 0.35);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0.06), 0 0 28px rgba(34, 197, 94, 0.25); }
    }
    .sf-title { font-size: 0.72rem; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(148, 163, 184, 0.88); }
    .sf-sub { margin-top: 0.12rem; font-size: 0.84rem; font-weight: 800; color: rgba(226, 232, 240, 0.95); }
    .sf-spark { margin-top: 0.55rem; opacity: 0.9; }
    .sf-spark svg { width: 100%; height: 28px; display: block; }
    .erp-nav-link {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.62rem 0.75rem;
      border-radius: 14px;
      color: rgba(226,232,240,0.88);
      text-decoration: none;
      font-size: 0.9375rem;
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease, border-color .15s ease;
      border: 1px solid transparent;
    }
    .erp-nav-link:hover { background: rgba(56,189,248,0.06); color: rgba(226,232,240,.98); border-color: rgba(56,189,248,.14); transform: translateY(-1px); }
    .erp-nav-link.active {
      background: linear-gradient(135deg, rgba(56,189,248,.16), rgba(59,130,246,.08));
      border-color: rgba(56,189,248,.22);
      color: rgba(226,232,240,.98);
      font-weight: 850;
      box-shadow: 0 18px 46px rgba(56,189,248,.08);
    }
    .nav-icon { width: 18px; height: 18px; display:inline-grid; place-items:center; opacity: 0.95; color: rgba(148,163,184,.92); }
    .erp-nav-link.active .nav-icon { color: rgba(56,189,248,.98); }
    .nav-icon svg { width: 18px; height: 18px; }

    .sf-main {
      grid-area: main;
      min-width: 0;
      min-height: 0;
      padding: 1.1rem 1.1rem 1.4rem;
      overflow: auto;
    }

    /* Collapsed sidebar (uses :has for modern browsers) */
    .sf-shell:has(#sbToggle:checked) {
      grid-template-columns: 88px minmax(0, 1fr);
    }
    .sf-shell:has(#sbToggle:checked) .sb-wordmark { display: none; }
    .sf-shell:has(#sbToggle:checked) .sb-brand { justify-content: center; }
    .sf-shell:has(#sbToggle:checked) .erp-nav-link { justify-content: center; gap: 0; padding: 0.62rem 0; }
    .sf-shell:has(#sbToggle:checked) .erp-nav-link .nav-icon { width: 20px; }
    .sf-shell:has(#sbToggle:checked) .erp-nav-link { font-size: 0; }
    .sf-shell:has(#sbToggle:checked) .erp-nav-link *:not(.nav-icon):not(svg):not(.nav-badge) { display: none; }
    .sf-shell:has(#sbToggle:checked) .nav-badge { display: none; }
    .sf-shell:has(#sbToggle:checked) .sb-footer { display: none; }

    @media (max-width: 1100px) {
      .tb-search { min-width: 180px; }
      .p-meta { display:none; }
    }
    @media (max-width: 920px) {
      .sf-shell { grid-template-columns: 88px minmax(0, 1fr); }
      .sb-wordmark { display:none; }
      .tb-search { display:none; }
    }
  `],
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  notifOpen = false;
  isDateOpen = false;
  search = '';
  selectedDate = new Date().toISOString().slice(0, 10);
  alertsCount = signal(0);

  constructor(
    public auth: AuthService,
    public lang: LanguageService,
    public notif: NotificationService,
    private api: ApiService,
  ) {}

  get selectedDateLabel(): string {
    // Keep a stable, premium-looking label without depending on i18n files.
    const d = new Date(this.selectedDate);
    if (Number.isNaN(d.getTime())) return this.selectedDate;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }

  ngOnInit(): void {
    this.notif.init();
    window.addEventListener('click', this.closeNotifOnOutside);
    const r = this.auth.currentUser()?.role;
    if (r === 'admin' || r === 'gestionnaire') {
      this.api
        .get<{ count?: number; alerts?: unknown[] }>('/alerts')
        .pipe(take(1))
        .subscribe({
          next: (res) => this.alertsCount.set(res.count ?? res.alerts?.length ?? 0),
          error: () => this.alertsCount.set(0),
        });
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('click', this.closeNotifOnOutside);
  }

  private closeNotifOnOutside = () => {
    this.notifOpen = false;
    this.isDateOpen = false;
  };

  toggleNotif(): void {
    this.notifOpen = !this.notifOpen;
  }

  onDateChange(v: string): void {
    this.selectedDate = v;
    this.isDateOpen = false;
  }

  openNotif(n: any): void {
    if (n?.id && !n.read_at) {
      this.notif.markRead(n.id);
    }
  }
}
