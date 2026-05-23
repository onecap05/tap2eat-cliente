import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../services/auth.service';
import { ownerGuard } from './owner.guard';

class FakeAuthService {
  public authenticated = true;
  public restaurantOwner = true;
  public logoutCalls = 0;

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  public isRestaurantOwner(): boolean {
    return this.restaurantOwner;
  }

  public logout(): void {
    this.logoutCalls++;
  }
}

describe('ownerGuard', () => {
  let authService: FakeAuthService;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = {
      createUrlTree: vi.fn((commands: string[]) => `TREE:${commands.join('/')}`)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: FakeAuthService },
        { provide: Router, useValue: router }
      ]
    });

    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
  });

  it('should allow access when user is an authenticated restaurant owner', () => {
    const result = TestBed.runInInjectionContext(() => ownerGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should logout and redirect to login when user is not authenticated', () => {
    authService.authenticated = false;

    const result = TestBed.runInInjectionContext(() => ownerGuard({} as never, {} as never));

    expect(authService.logoutCalls).toBe(1);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('TREE:/login');
  });

  it('should redirect to customer restaurants when authenticated user is not an owner', () => {
    authService.restaurantOwner = false;

    const result = TestBed.runInInjectionContext(() => ownerGuard({} as never, {} as never));

    expect(authService.logoutCalls).toBe(0);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/customer/restaurants']);
    expect(result).toBe('TREE:/customer/restaurants');
  });
});
