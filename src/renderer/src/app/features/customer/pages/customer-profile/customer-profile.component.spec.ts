import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { IMeResponse } from '../../../../models/IMeResponse';
import { AuthService } from '../../../../services/auth.service';
import { CustomerNotificationService } from '../../services/customer-notification.service';
import { CustomerProfileComponent } from './customer-profile.component';

class FakeAuthService {
  public account: IMeResponse = {
    id: 'account-1',
    email: 'cliente1@ejemplo.com',
    role: 'CUSTOMER',
    isActive: true,
    emailVerified: true,
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: '2281234567'
  };
  public shouldFail = false;

  public getCurrentAccount() {
    return this.shouldFail
      ? throwError(() => new Error('profile failed'))
      : of(this.account);
  }
}

class FakeCustomerNotificationService {
  public notifications$ = of([]);
  public unreadCount$ = of(0);
  public toast$ = of(null);

  public initializeForCurrentCustomer(): void {}
  public markAsRead(): void {}
  public markAllAsRead(): void {}
  public clearToast(): void {}
}

describe('CustomerProfileComponent', () => {
  let fixture: ComponentFixture<CustomerProfileComponent>;
  let component: CustomerProfileComponent;
  let authService: FakeAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useClass: FakeAuthService },
        { provide: CustomerNotificationService, useClass: FakeCustomerNotificationService }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
    fixture = TestBed.createComponent(CustomerProfileComponent);
    component = fixture.componentInstance;
  });

  it('loads current account and shows profile data', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(component.account?.id).toBe('account-1');
    expect(component.isLoading).toBe(false);
    expect(nativeElement.textContent).toContain('Nombre Apellido');
    expect(nativeElement.textContent).toContain('cliente1@ejemplo.com');
    expect(nativeElement.textContent).toContain('2281234567');
    expect(nativeElement.textContent).toContain('CUSTOMER');
    expect(nativeElement.textContent).toContain('Cuenta Activa');
    expect(nativeElement.textContent).toContain('Correo Verificado');
  });

  it('shows fallback when optional profile values are missing', () => {
    authService.account = {
      ...authService.account,
      firstName: null,
      lastName: null,
      phone: null,
      isActive: false,
      emailVerified: false
    };

    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(component.fullName).toBe('No disponible');
    expect(nativeElement.textContent).toContain('No disponible');
    expect(nativeElement.textContent).toContain('Cuenta Inactiva');
    expect(nativeElement.textContent).toContain('Correo Pendiente');
  });

  it('shows error state when profile request fails', () => {
    authService.shouldFail = true;

    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(component.isLoading).toBe(false);
    expect(component.account).toBeNull();
    expect(nativeElement.textContent).toContain('No pudimos cargar tu perfil');
  });
});
