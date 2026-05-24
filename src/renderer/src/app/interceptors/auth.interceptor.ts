import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
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

const NON_SESSION_401_PATHS = [
  '/api/reports/'
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (isPublicAuthRequest(request.url)) {
    return next(request);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const tokenStorageService = inject(TokenStorageService);
  const accessToken = tokenStorageService.getAccessToken();

  if (!accessToken) {
    return next(request);
  }

  if (authService.isTokenExpired()) {
    redirectToLogin(authService, router);

    return throwError(() => new HttpErrorResponse({
      status: 401,
      statusText: 'Token expired',
      url: request.url
    }));
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `${tokenStorageService.getTokenType()} ${accessToken}`
    }
  });

  return next(authenticatedRequest).pipe(
    catchError(error => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isNonSession401Request(request.url)
      ) {
        redirectToLogin(authService, router);
      }

      return throwError(() => error);
    })
  );
};

function redirectToLogin(authService: AuthService, router: Router): void {
  authService.logout();

  if (router.url !== '/login') {
    void router.navigate(['/login'], { replaceUrl: true });
  }
}

function isPublicAuthRequest(url: string): boolean {
  const requestPath = getRequestPath(url);

  return PUBLIC_AUTH_PATHS.some(publicPath => requestPath.endsWith(publicPath));
}

function isNonSession401Request(url: string): boolean {
  const requestPath = getRequestPath(url);

  return NON_SESSION_401_PATHS.some(path => requestPath.includes(path));
}

function getRequestPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}