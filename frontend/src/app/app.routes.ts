import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AUTH_ROUTES } from './features/auth/auth.routes';

export const routes: Routes = [
  // Routes auth en premier (chargement direct, pas de lazy load) pour que /register s'affiche
  ...AUTH_ROUTES,
  // Racine -> dashboard
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  // Chaque section protégée a son propre path (plus de path '' avec children qui capturait /register)
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
    ],
  },
  {
    path: 'vehicles',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/vehicles/vehicles.routes').then(m => m.VEHICLES_ROUTES),
  },
  {
    path: 'drivers',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrator'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/drivers/drivers.routes').then(m => m.DRIVERS_ROUTES),
  },
  {
    path: 'maintenances',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/maintenances/maintenances.routes').then(m => m.MAINTENANCES_ROUTES),
  },
  {
    path: 'fuel',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/fuel/fuel.routes').then(m => m.FUEL_ROUTES),
  },
  {
    path: 'alerts',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent) },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
