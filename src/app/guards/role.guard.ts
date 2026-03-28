import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const roles = route.data['roles'] as UserRole[] | undefined;
  const requiredRole = route.data['role'] as UserRole | undefined;
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  if (roles?.length) {
    if (currentUser.role === UserRole.SUPER_ADMIN || roles.includes(currentUser.role)) {
      return true;
    }
    router.navigate(['/403']);
    return false;
  }

  if (requiredRole) {
    if (currentUser.role === requiredRole || currentUser.role === UserRole.SUPER_ADMIN) {
      return true;
    }
    router.navigate(['/403']);
    return false;
  }

  return true;
};
