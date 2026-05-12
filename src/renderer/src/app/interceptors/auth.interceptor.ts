import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TokenStorageService } from '../services/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokenStorageService = inject(TokenStorageService);
  const accessToken = tokenStorageService.getAccessToken();

  if (!accessToken) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `${tokenStorageService.getTokenType()} ${accessToken}`
    }
  });

  return next(authenticatedRequest);
};