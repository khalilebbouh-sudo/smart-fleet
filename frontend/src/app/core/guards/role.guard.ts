import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data['roles'] as string[]) || [];
  const user = auth.currentUser();

  // If user is already loaded, decide synchronously.
  if (user) {
    return roles.length ? roles.includes(user.role) : true;
  }

  // If we have a token but user is not loaded yet, fetch it first.
  if (auth.isAuthenticated()) {
    return auth.fetchUser().pipe(
      map((u) => (roles.length ? roles.includes(u.role) : true)),
      catchError(() => of(router.createUrlTree(['/login']))),
      map((allowed) => (allowed === true ? true : router.createUrlTree(['/dashboard']))),
    );
  }

  return router.createUrlTree(['/login']);
};
