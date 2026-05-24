import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthService', () => {
  let service: AuthService;
  let tokenStorageService: TokenStorageService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        TokenStorageService
      ]
    });

    service = TestBed.inject(AuthService);
    tokenStorageService = TestBed.inject(TokenStorageService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('should return false when token is expired', () => {
    tokenStorageService.saveAccessToken(createJwt({ exp: Math.floor(Date.now() / 1000) - 60 }));

    expect(service.isTokenExpired()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should return true when token is valid', () => {
    tokenStorageService.saveAccessToken(createJwt({ exp: Math.floor(Date.now() / 1000) + 600 }));

    expect(service.isTokenExpired()).toBe(false);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should refresh access token and save returned session values', () => {
    tokenStorageService.saveRefreshToken('old-refresh-token');
    tokenStorageService.saveTokenType('Bearer');

    service.refreshAccessToken().subscribe(response => {
      expect(response.accessToken).toBe('new-access-token');
    });

    const request = httpTestingController.expectOne(`${environment.authApiUrl}/refresh`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'old-refresh-token' });

    request.flush({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900
    });

    expect(tokenStorageService.getAccessToken()).toBe('new-access-token');
    expect(tokenStorageService.getRefreshToken()).toBe('new-refresh-token');
    expect(tokenStorageService.getTokenType()).toBe('Bearer');
  });

  it('should keep existing refresh token when refresh response omits it', () => {
    tokenStorageService.saveRefreshToken('existing-refresh-token');

    service.refreshAccessToken().subscribe();

    const request = httpTestingController.expectOne(`${environment.authApiUrl}/refresh`);

    request.flush({
      accessToken: 'new-access-token'
    });

    expect(tokenStorageService.getAccessToken()).toBe('new-access-token');
    expect(tokenStorageService.getRefreshToken()).toBe('existing-refresh-token');
  });

  it('should error before HTTP request when refresh token is missing', () => {
    service.refreshAccessToken().subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('Refresh token is missing.');
      }
    });

    httpTestingController.expectNone(`${environment.authApiUrl}/refresh`);
  });
});

function createJwt(payload: Record<string, unknown>): string {
  const encodedHeader = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify(payload));

  return `${encodedHeader}.${encodedPayload}.signature`;
}
