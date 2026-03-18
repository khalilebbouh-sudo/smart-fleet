import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../core/services/language.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <div class="erp-layout">
      <header class="erp-header">
        <div class="header-left">
          <span class="logo">SMART FLEET</span>
          <span class="tagline">{{ 'APP.TAGLINE' | translate }}</span>
        </div>
        <div class="header-center">
          <span class="welcome">{{ 'HEADER.HELLO' | translate:{ name: auth.currentUser()?.name } }}</span>
        </div>
        <div class="header-right">
          <span class="user-badge">{{ auth.currentUser()?.name }}</span>
          <span class="user-role-badge">{{
            auth.currentUser()?.role === 'administrator'
              ? ('HEADER.ROLE_ADMIN' | translate)
              : ('HEADER.ROLE_MANAGER' | translate)
          }}</span>
          <button type="button" class="btn-header btn-lang" (click)="lang.toggle()">
            {{ lang.lang() === 'fr' ? ('HEADER.LANG_FR' | translate) : ('HEADER.LANG_EN' | translate) }}
          </button>
          <button type="button" class="btn-header" (click)="auth.logout()">{{ 'HEADER.LOGOUT' | translate }}</button>
        </div>
      </header>
      <aside class="erp-sidebar">
        <nav class="erp-nav">
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="erp-nav-link">
            <span class="nav-icon">📊</span> {{ 'NAV.DASHBOARD' | translate }}
          </a>
          <a routerLink="/vehicles" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon">🚗</span> {{ 'NAV.VEHICLES' | translate }}
          </a>
          @if (auth.isAdmin()) {
            <a routerLink="/drivers" routerLinkActive="active" class="erp-nav-link">
              <span class="nav-icon">👤</span> {{ 'NAV.DRIVERS' | translate }}
            </a>
          }
          <a routerLink="/maintenances" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon">🔧</span> {{ 'NAV.MAINTENANCE' | translate }}
          </a>
          <a routerLink="/fuel" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon">⛽</span> {{ 'NAV.FUEL' | translate }}
          </a>
          <a routerLink="/alerts" routerLinkActive="active" class="erp-nav-link">
            <span class="nav-icon">⚠️</span> {{ 'NAV.ALERTS' | translate }}
          </a>
        </nav>
        <div class="erp-sidebar-footer">
          © {{ currentYear }} Smart Fleet. All Rights Reserved.
        </div>
      </aside>
      <main class="erp-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .erp-layout { display: flex; flex-wrap: wrap; min-height: 100vh; }
    .erp-header {
      width: 100%;
      height: 56px;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .header-left { display: flex; align-items: baseline; gap: 0.5rem; }
    .logo { font-weight: 700; font-size: 1.25rem; color: #c62828; letter-spacing: 0.02em; }
    .tagline { font-size: 0.75rem; color: #666; margin-left: 0.25rem; }
    .header-center { flex: 1; text-align: center; }
    .welcome { font-size: 0.9375rem; color: #333; }
    .header-right { display: flex; align-items: center; gap: 0.75rem; }
    .user-badge { font-weight: 600; color: #333; font-size: 0.875rem; }
    .user-role-badge { font-size: 0.75rem; color: #666; text-transform: capitalize; }
    .btn-header {
      padding: 0.4rem 0.9rem;
      background: #1e3a5f;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-header:hover { background: #2c5282; }
    .btn-lang { background: #f0f0f0; color: #1e3a5f; }
    .btn-lang:hover { background: #e6e6e6; }
    .erp-sidebar {
      width: 240px;
      min-height: calc(100vh - 56px);
      background: #1e3a5f;
      display: flex;
      flex-direction: column;
    }
    .erp-nav { flex: 1; padding: 1rem 0; }
    .erp-nav-link {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1.25rem;
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      font-size: 0.9375rem;
      transition: background 0.15s, color 0.15s;
    }
    .erp-nav-link:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .erp-nav-link.active { background: rgba(255,255,255,0.15); color: #fff; font-weight: 500; }
    .nav-icon { font-size: 1rem; opacity: 0.95; }
    .erp-sidebar-footer {
      padding: 1rem 1.25rem;
      font-size: 0.7rem;
      color: rgba(255,255,255,0.6);
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .erp-main {
      flex: 1;
      min-width: 0;
      min-height: calc(100vh - 56px);
      background: #f5f6fa;
      padding: 1.5rem;
      overflow: auto;
    }
  `],
})
export class LayoutComponent {
  currentYear = new Date().getFullYear();
  constructor(
    public auth: AuthService,
    public lang: LanguageService,
  ) {}
}
