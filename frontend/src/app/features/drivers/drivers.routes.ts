import { Routes } from '@angular/router';

export const DRIVERS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./driver-list.component').then(m => m.DriverListComponent) },
  { path: 'new', loadComponent: () => import('./driver-form.component').then(m => m.DriverFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./driver-form.component').then(m => m.DriverFormComponent) },
];
