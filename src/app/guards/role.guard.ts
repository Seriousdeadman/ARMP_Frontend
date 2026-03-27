import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRole = route.data['role'] as UserRole;
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  if (currentUser.role === requiredRole || currentUser.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  router.navigate(['/403']);
  return false;
};
