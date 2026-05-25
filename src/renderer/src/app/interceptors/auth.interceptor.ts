import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

const PUBLIC_REQUEST_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/resend-verification-code',
  '/api/orders/public/track'
];

const NON_SESSION_401_PATHS = [
  '/api/reports/'
];

let refreshInProgress$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (isPublicRequest(request.url)) {
    return next(request);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const tokenStorageService = inject(TokenStorageService);
  const accessToken = tokenStorageService.getAccessToken();
  const refreshToken = tokenStorageService.getRefreshToken();

  if (!accessToken) {
    if (refreshToken) {
      return refreshAndRetryRequest(request, next, authService, tokenStorageService, router, true);
    }

    return redirectToLoginWithError(authService, router, request.url, 'Session token missing');
  }

  if (authService.isTokenExpired()) {
    if (refreshToken) {
      return refreshAndRetryRequest(request, next, authService, tokenStorageService, router, true);
    }

    return redirectToLoginWithError(authService, router, request.url, 'Token expired');
  }

  const authenticatedRequest = cloneWithAuthorization(request, tokenStorageService, accessToken);

  return next(authenticatedRequest).pipe(
    catchError(error => handleAuthError(
      error,
      request,
      next,
      authService,
      tokenStorageService,
      router,
      false
    ))
  );
};

function refreshAndRetryRequest(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  tokenStorageService: TokenStorageService,
  router: Router,
  refreshAlreadyAttempted: boolean
): Observable<HttpEvent<unknown>> {
  return getSharedRefreshAccessToken(authService).pipe(
    catchError(error => {
      redirectToLogin(authService, router);

      return throwError(() => error);
    }),
    switchMap(accessToken => next(cloneWithAuthorization(request, tokenStorageService, accessToken)).pipe(
      catchError(error => handleAuthError(
        error,
        request,
        next,
        authService,
        tokenStorageService,
        router,
        refreshAlreadyAttempted
      ))
    ))
  );
}

function handleAuthError(
  error: unknown,
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  tokenStorageService: TokenStorageService,
  router: Router,
  refreshAlreadyAttempted: boolean
): Observable<HttpEvent<unknown>> {
  if (
    !(error instanceof HttpErrorResponse) ||
    error.status !== 401 ||
    isNonSession401Request(request.url)
  ) {
    return throwError(() => error);
  }

  if (!refreshAlreadyAttempted && tokenStorageService.getRefreshToken()) {
    return refreshAndRetryRequest(
      request,
      next,
      authService,
      tokenStorageService,
      router,
      true
    );
  }

  redirectToLogin(authService, router);

  return throwError(() => error);
}

function getSharedRefreshAccessToken(authService: AuthService): Observable<string> {
  refreshInProgress$ ??= authService.refreshAccessToken().pipe(
    map(response => response.accessToken),
    finalize(() => {
      refreshInProgress$ = null;
    }),
    shareReplay(1)
  );

  return refreshInProgress$;
}

function cloneWithAuthorization(
  request: HttpRequest<unknown>,
  tokenStorageService: TokenStorageService,
  accessToken: string
): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `${tokenStorageService.getTokenType()} ${accessToken}`
    }
  });
}

function redirectToLogin(authService: AuthService, router: Router): void {
  authService.logout();

  if (router.url !== '/login') {
    void router.navigate(['/login'], { replaceUrl: true });
  }
}

function redirectToLoginWithError(
  authService: AuthService,
  router: Router,
  url: string,
  statusText: string
): Observable<never> {
  redirectToLogin(authService, router);

  return throwError(() => new HttpErrorResponse({
    status: 401,
    statusText,
    url
  }));
}

function isPublicRequest(url: string): boolean {
  const requestPath = getRequestPath(url);

  return PUBLIC_REQUEST_PATHS.some(publicPath => (
    requestPath === publicPath ||
    requestPath.startsWith(`${publicPath}/`)
  ));
}

function isNonSession401Request(url: string): boolean {
  const requestPath = getRequestPath(url);

  return NON_SESSION_401_PATHS.some(path => requestPath.includes(path));
}

function getRequestPath(url: string): string {
  try {
    return new URL(url, 'http://tap2eat.local').pathname;
  } catch {
    return url;
  }
}
