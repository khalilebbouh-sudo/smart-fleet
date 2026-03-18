import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data['roles'] as string[]) || [];
  const user = auth.currentUser();
  if (user && roles.length && roles.includes(user.role)) {
    return true;
  }
  router.navigate(['/dashboard']);
  return false;
};
