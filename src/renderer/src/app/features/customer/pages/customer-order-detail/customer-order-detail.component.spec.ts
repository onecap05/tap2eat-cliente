import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { OrderResponse } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';
import { PickupQrService } from '../../services/pickup-qr.service';
import { CustomerOrderDetailComponent } from './customer-order-detail.component';

class FakeOrderApiService {
  public lastOrderId = '';

  public getOrderById(orderId: string) {
    this.lastOrderId = orderId;
    return of(order());
  }
}

class FakePaymentApiService {
  public shouldFail = false;
  public lastOrderId = '';

  public getPaymentByOrderId(orderId: string) {
    this.lastOrderId = orderId;

    if (this.shouldFail) {
      return throwError(() => new Error('payment missing'));
    }

    return of(payment());
  }
}

class FakePickupQrService {
  public shouldFail = false;
  public lastOrder: OrderResponse | null = null;

  public generatePickupQrDataUrl(orderResponse: OrderResponse): Promise<string> {
    this.lastOrder = orderResponse;

    if (this.shouldFail) {
      return Promise.reject(new Error('qr failed'));
    }

    return Promise.resolve('data:image/png;base64,qr');
  }
}

class FakeCustomerCatalogApiService {
  public restaurantName: string | null = 'Taqueria Centro';
  public branchName: string | null = 'Sucursal Reforma';

  public getRestaurant(restaurantId: string) {
    return of(this.restaurantName ? { id: restaurantId, name: this.restaurantName, open: true } : null);
  }

  public getBranches(restaurantId: string) {
    return of(this.branchName ? [{
      id: 'branch-long-8f7a',
      restaurantId,
      name: this.branchName,
      formattedAddress: 'Calle 1',
      latitude: 0,
      longitude: 0,
      isMainBranch: true,
      active: true,
      open: true
    }] : []);
  }
}

describe('CustomerOrderDetailComponent', () => {
  let fixture: ComponentFixture<CustomerOrderDetailComponent>;
  let component: CustomerOrderDetailComponent;
  let orderApiService: FakeOrderApiService;
  let paymentApiService: FakePaymentApiService;
  let pickupQrService: FakePickupQrService;
  let customerCatalogApiService: FakeCustomerCatalogApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerOrderDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'orderId' ? 'order-1' : null
              }
            }
          }
        },
        { provide: OrderApiService, useClass: FakeOrderApiService },
        { provide: PaymentApiService, useClass: FakePaymentApiService },
        { provide: PickupQrService, useClass: FakePickupQrService },
        { provide: CustomerCatalogApiService, useClass: FakeCustomerCatalogApiService }
      ]
    }).compileComponents();

    orderApiService = TestBed.inject(OrderApiService) as unknown as FakeOrderApiService;
    paymentApiService = TestBed.inject(PaymentApiService) as unknown as FakePaymentApiService;
    pickupQrService = TestBed.inject(PickupQrService) as unknown as FakePickupQrService;
    customerCatalogApiService = TestBed.inject(CustomerCatalogApiService) as unknown as FakeCustomerCatalogApiService;
    fixture = TestBed.createComponent(CustomerOrderDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load order by id', () => {
    fixture.detectChanges();

    expect(orderApiService.lastOrderId).toBe('order-1');
    expect(component.order?.id).toBe('order-1');
  });

  it('should load payment by order id', () => {
    fixture.detectChanges();

    expect(paymentApiService.lastOrderId).toBe('order-1');
    expect(component.payment?.status).toBe('Approved');
  });

  it('should not fail when payment request fails', () => {
    paymentApiService.shouldFail = true;
    fixture.detectChanges();

    expect(component.order?.id).toBe('order-1');
    expect(component.payment).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pago no disponible');
  });

  it('should show status and total', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Preparando');
    expect(fixture.nativeElement.textContent).toContain('$100.00');
  });

  it('should show pickup QR when it is generated', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const image: HTMLImageElement = fixture.nativeElement.querySelector('.pickup-qr img');

    expect(pickupQrService.lastOrder?.id).toBe('order-1');
    expect(image.getAttribute('src')).toContain('data:image/png;base64,qr');
  });

  it('should show QR fallback when generation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pickupQrService.shouldFail = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Código de pedido: #');
  });

  it('should show restaurant and branch names when available', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Taqueria Centro');
    expect(fixture.nativeElement.textContent).toContain('Sucursal Reforma');
  });

  it('should show short fallbacks and hide long raw ids when names are unavailable', () => {
    customerCatalogApiService.restaurantName = null;
    customerCatalogApiService.branchName = null;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Restaurante #1384D0');
    expect(text).toContain('Sucursal #8F7A');
    expect(text).not.toContain('restaurant-long-1384d0');
    expect(text).not.toContain('branch-long-8f7a');
  });
});

function order(): OrderResponse {
  return {
    id: 'order-1',
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-long-1384d0',
    branchId: 'branch-long-8f7a',
    items: [
      {
        productId: 'product-1',
        productNameSnapshot: 'Taco',
        quantity: 2,
        unitPriceSnapshot: 50,
        selectedModifiers: [
          {
            modifierGroupId: 'group-1',
            modifierGroupName: 'Salsa',
            modifierOptionId: 'option-1',
            modifierOptionName: 'Verde',
            priceAdjustment: 0
          }
        ],
        subtotal: 100
      }
    ],
    subtotal: 100,
    total: 100,
    status: 'Preparing',
    notes: 'Sin cebolla',
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}

function payment(): PaymentResponse {
  return {
    id: 'payment-1',
    orderId: 'order-1',
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-long-1384d0',
    branchId: 'branch-long-8f7a',
    amount: 100,
    currency: 'MXN',
    status: 'Approved',
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}
