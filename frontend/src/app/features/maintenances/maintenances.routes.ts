import { Routes } from '@angular/router';

export const MAINTENANCES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./maintenance-list.component').then(m => m.MaintenanceListComponent) },
  { path: 'new', loadComponent: () => import('./maintenance-form.component').then(m => m.MaintenanceFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./maintenance-form.component').then(m => m.MaintenanceFormComponent) },
];
