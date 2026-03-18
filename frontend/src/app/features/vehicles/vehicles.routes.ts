import { Routes } from '@angular/router';

export const VEHICLES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./vehicle-list.component').then(m => m.VehicleListComponent) },
  { path: 'new', loadComponent: () => import('./vehicle-form.component').then(m => m.VehicleFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./vehicle-form.component').then(m => m.VehicleFormComponent) },
];
