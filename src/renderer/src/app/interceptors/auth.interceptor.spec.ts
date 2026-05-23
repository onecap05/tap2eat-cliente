import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { authInterceptor } from './auth.interceptor';

class FakeAuthService {
  public expired = false;
  public logoutCalls = 0;

  public isTokenExpired(): boolean {
    return this.expired;
  }

  public logout(): void {
    this.logoutCalls++;
  }
}

class FakeTokenStorageService {
  public token: string | null = 'valid-token';

  public getAccessToken(): string | null {
    return this.token;
  }

  public getTokenType(): string {
    return 'Bearer';
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

  it('should not add token to public auth routes', () => {
    httpClient.post(`${environment.authApiUrl}/login`, {}).subscribe();

    const request = httpTestingController.expectOne(`${environment.authApiUrl}/login`);

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('should clear session and redirect to login on 401', () => {
    httpClient.get('/api/orders/order-1').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    const request = httpTestingController.expectOne('/api/orders/order-1');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logoutCalls).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should redirect before request when token is expired', () => {
    authService.expired = true;

    httpClient.get('/api/orders/order-1').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    httpTestingController.expectNone('/api/orders/order-1');
    expect(authService.logoutCalls).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should continue without Authorization when token is missing', () => {
    tokenStorageService.token = null;

    httpClient.get('/api/orders/order-1').subscribe();

    const request = httpTestingController.expectOne('/api/orders/order-1');

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
