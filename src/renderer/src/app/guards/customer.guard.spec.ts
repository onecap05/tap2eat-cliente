import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { CustomerNotificationService } from '../features/customer/services/customer-notification.service';
import { AuthService } from '../services/auth.service';
import { customerGuard } from './customer.guard';

class FakeAuthService {
  public authenticated = true;
  public restaurantOwner = false;
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

class FakeCustomerNotificationService {
  public initializeCalls = 0;

  public initializeForCurrentCustomer(): void {
    this.initializeCalls++;
  }
}

describe('customerGuard', () => {
  let authService: FakeAuthService;
  let customerNotificationService: FakeCustomerNotificationService;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = {
      createUrlTree: vi.fn((commands: string[]) => `TREE:${commands.join('/')}`)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: FakeAuthService },
        { provide: CustomerNotificationService, useClass: FakeCustomerNotificationService },
        { provide: Router, useValue: router }
      ]
    });

    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
    customerNotificationService = TestBed.inject(CustomerNotificationService) as unknown as FakeCustomerNotificationService;
  });

  it('should allow access and initialize customer realtime notifications', () => {
    const result = TestBed.runInInjectionContext(() => customerGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(customerNotificationService.initializeCalls).toBe(1);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should logout and redirect to login when user is not authenticated', () => {
    authService.authenticated = false;

    const result = TestBed.runInInjectionContext(() => customerGuard({} as never, {} as never));

    expect(authService.logoutCalls).toBe(1);
    expect(customerNotificationService.initializeCalls).toBe(0);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('TREE:/login');
  });

  it('should redirect to owner dashboard when authenticated user is a restaurant owner', () => {
    authService.restaurantOwner = true;

    const result = TestBed.runInInjectionContext(() => customerGuard({} as never, {} as never));

    expect(authService.logoutCalls).toBe(0);
    expect(customerNotificationService.initializeCalls).toBe(0);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/owner/dashboard']);
    expect(result).toBe('TREE:/owner/dashboard');
  });
});
