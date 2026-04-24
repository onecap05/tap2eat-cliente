import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
    return true;
  }

  return router.createUrlTree(['/login']);
};