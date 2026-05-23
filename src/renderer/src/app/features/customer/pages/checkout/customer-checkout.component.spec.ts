import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { defer, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../../services/auth.service';
import { CustomerProductResponse } from '../../models/customer-catalog.models';
import { CartService } from '../../services/cart.service';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';
import { CustomerCheckoutComponent } from './customer-checkout.component';

class FakeOrderApiService {
  public createOrderCalls = 0;
  public lastRequest: unknown;
  public shouldFail = false;

  public createOrder(request: unknown) {
    this.createOrderCalls++;
    this.lastRequest = request;

    if (this.shouldFail) {
      return throwError(() => new Error('create failed'));
    }

    return of({
      id: 'order-1',
      customerAccountId: 'customer-1',
      restaurantId: 'restaurant-1',
      branchId: 'branch-1',
      items: [],
      subtotal: 100,
      total: 100,
      status: 'Created',
      createdAt: '',
      updatedAt: ''
    });
  }
}

class FakePaymentApiService {
  public getPaymentByOrderIdCalls = 0;
  public approvePaymentCalls = 0;
  public failuresBeforeSuccess = 0;
  public paymentStatus = 'Pending';

  public getPaymentByOrderId() {
    return defer(() => {
      this.getPaymentByOrderIdCalls++;

      if (this.failuresBeforeSuccess > 0) {
        this.failuresBeforeSuccess--;
        return throwError(() => new Error('payment not found'));
      }

      return of({
        id: 'payment-1',
        orderId: 'order-1',
        customerAccountId: 'customer-1',
        restaurantId: 'restaurant-1',
        branchId: 'branch-1',
        amount: 100,
        currency: 'MXN',
        status: this.paymentStatus,
        createdAt: '',
        updatedAt: ''
      });
    });
  }

  public approvePayment() {
    this.approvePaymentCalls++;
    return of({
      id: 'payment-1',
      orderId: 'order-1',
      customerAccountId: 'customer-1',
      restaurantId: 'restaurant-1',
      branchId: 'branch-1',
      amount: 100,
      currency: 'MXN',
      status: 'Approved',
      createdAt: '',
      updatedAt: ''
    });
  }
}

class FakeAuthService {
  public accountId: string | null = 'customer-1';

  public getAccountId(): string | null {
    return this.accountId;
  }
}

describe('CustomerCheckoutComponent', () => {
  let fixture: ComponentFixture<CustomerCheckoutComponent>;
  let component: CustomerCheckoutComponent;
  let cartService: CartService;
  let orderApiService: FakeOrderApiService;
  let paymentApiService: FakePaymentApiService;
  let authService: FakeAuthService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [CustomerCheckoutComponent],
      providers: [
        provideRouter([]),
        CartService,
        { provide: OrderApiService, useClass: FakeOrderApiService },
        { provide: PaymentApiService, useClass: FakePaymentApiService },
        { provide: AuthService, useClass: FakeAuthService }
      ]
    }).compileComponents();

    cartService = TestBed.inject(CartService);
    orderApiService = TestBed.inject(OrderApiService) as unknown as FakeOrderApiService;
    paymentApiService = TestBed.inject(PaymentApiService) as unknown as FakePaymentApiService;
    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
    fixture = TestBed.createComponent(CustomerCheckoutComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should show empty state when cart is empty', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu carrito esta vacio');
  });

  it('should calculate total from cart service', () => {
    seedCart();
    fixture.detectChanges();

    expect(component.total).toBe(120);
  });

  it('should create order, get payment and approve payment for online checkout', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    seedCart();
    fixture.detectChanges();

    component.submitCheckout();
    await fixture.whenStable();

    expect(orderApiService.createOrderCalls).toBe(1);
    expect(paymentApiService.getPaymentByOrderIdCalls).toBe(1);
    expect(paymentApiService.approvePaymentCalls).toBe(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/customer/payment-success', 'order-1'],
      { replaceUrl: true }
    );
  });

  it('should retry online checkout when payment is not available immediately', async () => {
    vi.useFakeTimers();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    paymentApiService.failuresBeforeSuccess = 1;
    seedCart();
    fixture.detectChanges();

    component.submitCheckout();
    await vi.advanceTimersByTimeAsync(700);
    await fixture.whenStable();

    expect(paymentApiService.getPaymentByOrderIdCalls).toBe(2);
    expect(paymentApiService.approvePaymentCalls).toBe(1);
  });

  it('should not approve payment again when it is already approved', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    paymentApiService.paymentStatus = 'Approved';
    seedCart();
    fixture.detectChanges();

    component.submitCheckout();
    await fixture.whenStable();

    expect(paymentApiService.approvePaymentCalls).toBe(0);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/customer/payment-success', 'order-1'],
      { replaceUrl: true }
    );
  });

  it('should create cash order without approving payment', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.paymentMethod = 'cash';
    seedCart();
    fixture.detectChanges();

    component.submitCheckout();
    await fixture.whenStable();

    expect(orderApiService.createOrderCalls).toBe(1);
    expect((orderApiService.lastRequest as any).items[0].selectedModifierOptionIds).toEqual([]);
    expect(paymentApiService.getPaymentByOrderIdCalls).toBe(0);
    expect(paymentApiService.approvePaymentCalls).toBe(0);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/customer/orders', 'order-1', 'confirmation'],
      { replaceUrl: true }
    );
  });

  it('should send real modifier option ids in order request', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.paymentMethod = 'cash';
    seedCartWithModifier();
    fixture.detectChanges();

    component.submitCheckout();
    await fixture.whenStable();

    expect(orderApiService.createOrderCalls).toBe(1);
    expect((orderApiService.lastRequest as any).items[0].selectedModifierOptionIds)
      .toEqual(['modifier-option-real-1']);
  });

  it('should show error and release submit button when create order fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    orderApiService.shouldFail = true;
    seedCart();
    fixture.detectChanges();

    component.submitCheckout();

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toContain('No pudimos completar');
    expect(console.error).toHaveBeenCalledWith('Checkout failed:', expect.any(Error));
  });

  it('should not submit when branch id is missing', () => {
    cartService.addItem({
      product: product(),
      quantity: 1,
      modifierSelections: []
    });
    fixture.detectChanges();

    component.submitCheckout();

    expect(orderApiService.createOrderCalls).toBe(0);
    expect(component.errorMessage).toContain('Selecciona una sucursal');
  });

  it('should not submit when selected modifier does not have a real option id', () => {
    seedCart();
    fixture.detectChanges();
    component.cartState = {
      ...component.cartState,
      items: [
        {
          ...component.cartState.items[0],
          selectedModifiers: [
            {
              groupId: 'group-1',
              groupName: 'Pan',
              optionId: 'Pan brioche',
              optionName: 'Pan brioche',
              additionalPrice: 0
            }
          ]
        }
      ]
    };

    component.submitCheckout();

    expect(orderApiService.createOrderCalls).toBe(0);
    expect(component.errorMessage).toContain('identificador valido');
  });

  it('should not submit when customer account id is missing', () => {
    authService.accountId = null;
    seedCart();
    fixture.detectChanges();

    component.submitCheckout();

    expect(orderApiService.createOrderCalls).toBe(0);
    expect(component.errorMessage).toContain('Inicia sesion');
  });

  function seedCart(): void {
    cartService.addItem({
      product: product(),
      branchId: 'branch-1',
      quantity: 2,
      modifierSelections: []
    });
  }

  function seedCartWithModifier(): void {
    cartService.addItem({
      product: product(),
      branchId: 'branch-1',
      quantity: 1,
      modifierSelections: [
        {
          group: {
            id: 'modifier-group-1',
            name: 'Pan',
            selectionType: 'SINGLE',
            required: true,
            minSelections: 1,
            maxSelections: 1,
            active: true,
            options: []
          },
          options: [
            {
              id: 'modifier-option-real-1',
              name: 'Pan brioche',
              additionalPrice: 10,
              active: true
            }
          ]
        }
      ]
    });
  }

  function product(): CustomerProductResponse {
    return {
      id: 'product-1',
      restaurantId: 'restaurant-1',
      categoryId: 'category-1',
      name: 'Taco',
      productType: 'SIMPLE',
      price: 60,
      featured: false,
      active: true,
      available: true,
      tags: [],
      dietaryFlags: [],
      allergens: [],
      modifierGroups: []
    };
  }
});
