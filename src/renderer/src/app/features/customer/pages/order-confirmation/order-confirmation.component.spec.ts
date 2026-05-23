import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { OrderResponse } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';
import { PickupQrService } from '../../services/pickup-qr.service';
import { OrderConfirmationComponent } from './order-confirmation.component';

class FakeOrderApiService {
  public getOrderById() {
    return of(order());
  }
}

class FakePaymentApiService {
  public getPaymentByOrderId() {
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

describe('OrderConfirmationComponent', () => {
  let fixture: ComponentFixture<OrderConfirmationComponent>;
  let pickupQrService: FakePickupQrService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmationComponent],
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
        { provide: PickupQrService, useClass: FakePickupQrService }
      ]
    }).compileComponents();

    pickupQrService = TestBed.inject(PickupQrService) as unknown as FakePickupQrService;
    fixture = TestBed.createComponent(OrderConfirmationComponent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate pickup QR for the confirmed order', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const image: HTMLImageElement = fixture.nativeElement.querySelector('.qr-card img');

    expect(pickupQrService.lastOrder?.id).toBe('order-1');
    expect(image.getAttribute('src')).toContain('data:image/png;base64,qr');
  });

  it('should show fallback when pickup QR generation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pickupQrService.shouldFail = true;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Codigo de pedido: #');
  });
});

function order(): OrderResponse {
  return {
    id: 'order-1',
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-1',
    branchId: 'branch-1',
    items: [],
    subtotal: 120,
    total: 120,
    status: 'Ready',
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}

function payment(): PaymentResponse {
  return {
    id: 'payment-1',
    orderId: 'order-1',
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-1',
    branchId: 'branch-1',
    amount: 120,
    currency: 'MXN',
    status: 'Approved',
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}
