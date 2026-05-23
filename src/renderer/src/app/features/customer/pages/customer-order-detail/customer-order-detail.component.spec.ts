import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { OrderResponse } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';
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

describe('CustomerOrderDetailComponent', () => {
  let fixture: ComponentFixture<CustomerOrderDetailComponent>;
  let component: CustomerOrderDetailComponent;
  let orderApiService: FakeOrderApiService;
  let paymentApiService: FakePaymentApiService;

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
        { provide: PaymentApiService, useClass: FakePaymentApiService }
      ]
    }).compileComponents();

    orderApiService = TestBed.inject(OrderApiService) as unknown as FakeOrderApiService;
    paymentApiService = TestBed.inject(PaymentApiService) as unknown as FakePaymentApiService;
    fixture = TestBed.createComponent(CustomerOrderDetailComponent);
    component = fixture.componentInstance;
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
});

function order(): OrderResponse {
  return {
    id: 'order-1',
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-1',
    branchId: 'branch-1',
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
    restaurantId: 'restaurant-1',
    branchId: 'branch-1',
    amount: 100,
    currency: 'MXN',
    status: 'Approved',
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}
