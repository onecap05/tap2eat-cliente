import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TokenStorageService } from '../services/token-storage.service';

const PUBLIC_AUTH_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/resend-verification-code'
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (isPublicAuthRequest(request.url)) {
    return next(request);
  }

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

function isPublicAuthRequest(url: string): boolean {
  const requestPath = getRequestPath(url);

  return PUBLIC_AUTH_PATHS.some(publicPath => requestPath.endsWith(publicPath));
}

function getRequestPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}