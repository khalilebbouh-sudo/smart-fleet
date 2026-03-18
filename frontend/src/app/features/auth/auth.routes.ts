import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

/**
 * Routes auth avec lazy-loading des composants (login/register/forgot/reset).
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password.component').then(m => m.ResetPasswordComponent),
  },
];
