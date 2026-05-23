import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

class FakeAuthService {
  public authenticated = true;
  public logoutCalls = 0;

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  public logout(): void {
    this.logoutCalls++;
  }
}

describe('authGuard', () => {
  let authService: FakeAuthService;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = {
      createUrlTree: vi.fn().mockReturnValue('LOGIN_TREE')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: FakeAuthService },
        { provide: Router, useValue: router }
      ]
    });

    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
  });

  it('should allow authenticated users', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('should logout and redirect to login when token is expired or invalid', () => {
    authService.authenticated = false;

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(authService.logoutCalls).toBe(1);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('LOGIN_TREE');
  });
});
