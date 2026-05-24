import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { environment } from '../../environments/environment';
import { IRefreshTokenResponse } from '../models/IRefreshTokenResponse';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { authInterceptor } from './auth.interceptor';

class FakeAuthService {
  public expired = false;
  public logoutCalls = 0;
  public refreshCalls = 0;
  public refreshResult$: Observable<IRefreshTokenResponse> | null = null;

  public isTokenExpired(): boolean {
    return this.expired;
  }

  public refreshAccessToken(): Observable<IRefreshTokenResponse> {
    this.refreshCalls++;

    return this.refreshResult$ ?? of({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      tokenType: 'Bearer'
    });
  }

  public logout(): void {
    this.logoutCalls++;
  }
}

class FakeTokenStorageService {
  public token: string | null = 'valid-token';
  public refreshToken: string | null = 'valid-refresh-token';
  public tokenType = 'Bearer';

  public getAccessToken(): string | null {
    return this.token;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public getTokenType(): string {
    return this.tokenType;
  }
}

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: FakeAuthService;
  let tokenStorageService: FakeTokenStorageService;
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = {
      url: '/customer/orders',
      navigate: vi.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useClass: FakeAuthService },
        { provide: TokenStorageService, useClass: FakeTokenStorageService },
        { provide: Router, useValue: router }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
    tokenStorageService = TestBed.inject(TokenStorageService) as unknown as FakeTokenStorageService;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should add Authorization header with valid token', () => {
    httpClient.get('/api/orders/order-1').subscribe();

    const request = httpTestingController.expectOne('/api/orders/order-1');

    expect(request.request.headers.get('Authorization')).toBe('Bearer valid-token');
    request.flush({});
  });

  it('should not add token or refresh public auth routes', () => {
    authService.expired = true;

    httpClient.post(`${environment.authApiUrl}/login`, {}).subscribe();

    const request = httpTestingController.expectOne(`${environment.authApiUrl}/login`);

    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(authService.refreshCalls).toBe(0);
    request.flush({});
  });

  it('should refresh expired access token and retry protected request', () => {
    authService.expired = true;

    httpClient.get('/api/orders/order-1').subscribe();

    const request = httpTestingController.expectOne('/api/orders/order-1');

    expect(authService.refreshCalls).toBe(1);
    expect(request.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    request.flush({});
  });

  it('should refresh when access token is missing but refresh token exists', () => {
    tokenStorageService.token = null;

    httpClient.get('/api/orders/order-1').subscribe();

    const request = httpTestingController.expectOne('/api/orders/order-1');

    expect(authService.refreshCalls).toBe(1);
    expect(request.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    request.flush({});
  });

  it('should clear session and redirect to login when refresh token is missing', () => {
    authService.expired = true;
    tokenStorageService.refreshToken = null;

    httpClient.get('/api/orders/order-1').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    httpTestingController.expectNone('/api/orders/order-1');
    expect(authService.refreshCalls).toBe(0);
    expect(authService.logoutCalls).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should clear session and redirect to login when refresh fails', () => {
    authService.expired = true;
    authService.refreshResult$ = throwError(() => new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      url: `${environment.authApiUrl}/refresh`
    }));

    httpClient.get('/api/orders/order-1').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    httpTestingController.expectNone('/api/orders/order-1');
    expect(authService.refreshCalls).toBe(1);
    expect(authService.logoutCalls).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should refresh once and retry when protected request returns 401', () => {
    httpClient.get('/api/orders/order-1').subscribe();

    const firstRequest = httpTestingController.expectOne('/api/orders/order-1');
    expect(firstRequest.request.headers.get('Authorization')).toBe('Bearer valid-token');
    firstRequest.flush({}, { status: 401, statusText: 'Unauthorized' });

    const retryRequest = httpTestingController.expectOne('/api/orders/order-1');
    expect(authService.refreshCalls).toBe(1);
    expect(retryRequest.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    retryRequest.flush({});
  });

  it('should not loop when retried protected request returns 401', () => {
    httpClient.get('/api/orders/order-1').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    const firstRequest = httpTestingController.expectOne('/api/orders/order-1');
    firstRequest.flush({}, { status: 401, statusText: 'Unauthorized' });

    const retryRequest = httpTestingController.expectOne('/api/orders/order-1');
    retryRequest.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshCalls).toBe(1);
    expect(authService.logoutCalls).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should share one refresh for simultaneous expired-token requests', () => {
    const refreshSubject = new Subject<IRefreshTokenResponse>();
    authService.expired = true;
    authService.refreshResult$ = refreshSubject.asObservable();

    httpClient.get('/api/orders/order-1').subscribe();
    httpClient.get('/api/payments/payment-1').subscribe();

    expect(authService.refreshCalls).toBe(1);
    httpTestingController.expectNone('/api/orders/order-1');
    httpTestingController.expectNone('/api/payments/payment-1');

    refreshSubject.next({
      accessToken: 'shared-access-token',
      refreshToken: 'shared-refresh-token',
      tokenType: 'Bearer'
    });
    refreshSubject.complete();

    const orderRequest = httpTestingController.expectOne('/api/orders/order-1');
    const paymentRequest = httpTestingController.expectOne('/api/payments/payment-1');

    expect(orderRequest.request.headers.get('Authorization')).toBe('Bearer shared-access-token');
    expect(paymentRequest.request.headers.get('Authorization')).toBe('Bearer shared-access-token');
    orderRequest.flush({});
    paymentRequest.flush({});
  });

  it('should keep non-session 401 paths from closing the session', () => {
    httpClient.get('/api/reports/sales').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    const request = httpTestingController.expectOne('/api/reports/sales');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshCalls).toBe(0);
    expect(authService.logoutCalls).toBe(0);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
