import { Routes } from '@angular/router';

export const FUEL_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./fuel-list.component').then(m => m.FuelListComponent) },
  { path: 'new', loadComponent: () => import('./fuel-form.component').then(m => m.FuelFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./fuel-form.component').then(m => m.FuelFormComponent) },
];
