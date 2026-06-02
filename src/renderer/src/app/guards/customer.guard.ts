import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { CustomerNotificationService } from '../features/customer/services/customer-notification.service';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const customerNotificationService = inject(CustomerNotificationService);

  if (!authService.isAuthenticated()) {
    authService.logout();
    return router.createUrlTree(['/login']);
  }

  if (!authService.isRestaurantOwner()) {
    customerNotificationService.initializeForCurrentCustomer();
    return true;
  }

  return router.createUrlTree(['/owner/dashboard']);
};
