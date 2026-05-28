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
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/vehicles/vehicles.routes').then(m => m.VEHICLES_ROUTES),
  },
  {
    path: 'drivers',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/drivers/drivers.routes').then(m => m.DRIVERS_ROUTES),
  },
  {
    path: 'maintenances',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/maintenances/maintenances.routes').then(m => m.MAINTENANCES_ROUTES),
  },
  {
    path: 'fuel',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/fuel/fuel.routes').then(m => m.FUEL_ROUTES),
  },
  {
    path: 'alerts',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent) },
    ],
  },
  {
    path: 'fleet/live',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/fleet/fleet-live-map.component').then(m => m.FleetLiveMapComponent) },
    ],
  },
  {
    path: 'missions',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/missions/missions-list.component').then(m => m.MissionsListComponent) },
      { path: ':id', loadComponent: () => import('./features/missions/mission-detail.component').then(m => m.MissionDetailComponent) },
    ],
  },
  {
    path: 'my-missions',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['chauffeur'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/missions/missions-list.component').then(m => m.MissionsListComponent) },
      { path: ':id', loadComponent: () => import('./features/missions/mission-detail.component').then(m => m.MissionDetailComponent) },
    ],
  },
  {
    path: 'incidents',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['chauffeur'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/incidents/incidents-list.component').then(m => m.IncidentsListComponent) },
      { path: 'report', loadComponent: () => import('./features/incidents/report-incident.component').then(m => m.ReportIncidentComponent) },
    ],
  },
  {
    path: 'trajets',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['chauffeur'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/trajets/trajets-list.component').then(m => m.TrajetsListComponent) },
      { path: ':id', loadComponent: () => import('./features/trajets/trajets-tracking').then(m => m.TrajetsTrackingComponent) },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: 'users', loadComponent: () => import('./features/admin/user-management.component').then(m => m.UserManagementComponent) },
    ],
  },
  {
    path: 'email-logs',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'gestionnaire'] },
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/admin/email-logs.component').then(m => m.EmailLogsComponent) },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
