import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthService', () => {
  let service: AuthService;
  let tokenStorageService: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        AuthService,
        TokenStorageService
      ]
    });

    service = TestBed.inject(AuthService);
    tokenStorageService = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
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
});

function createJwt(payload: Record<string, unknown>): string {
  const encodedHeader = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify(payload));

  return `${encodedHeader}.${encodedPayload}.signature`;
}
