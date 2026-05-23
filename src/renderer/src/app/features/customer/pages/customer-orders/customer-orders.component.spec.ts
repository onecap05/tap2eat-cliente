import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { OrderResponse, OrderStatus } from '../../models/order.models';
import { OrderApiService } from '../../services/order-api.service';
import { CustomerOrdersComponent } from './customer-orders.component';

class FakeAuthService {
  public accountId: string | null = 'customer-1';

  public getAccountId(): string | null {
    return this.accountId;
  }
}

class FakeOrderApiService {
  public lastCustomerAccountId = '';
  public lastFilters: unknown;
  public orders: OrderResponse[] = [order()];

  public getCustomerOrders(customerAccountId: string, filters?: unknown) {
    this.lastCustomerAccountId = customerAccountId;
    this.lastFilters = filters;
    return of(this.orders);
  }
}

describe('CustomerOrdersComponent', () => {
  let fixture: ComponentFixture<CustomerOrdersComponent>;
  let component: CustomerOrdersComponent;
  let orderApiService: FakeOrderApiService;
  let authService: FakeAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerOrdersComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useClass: FakeAuthService },
        { provide: OrderApiService, useClass: FakeOrderApiService }
      ]
    }).compileComponents();

    orderApiService = TestBed.inject(OrderApiService) as unknown as FakeOrderApiService;
    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
    fixture = TestBed.createComponent(CustomerOrdersComponent);
    component = fixture.componentInstance;
  });

  it('should load customer orders', () => {
    fixture.detectChanges();

    expect(orderApiService.lastCustomerAccountId).toBe('customer-1');
    expect(component.orders.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Pedido #');
  });

  it('should filter by status', () => {
    fixture.detectChanges();

    component.setStatusFilter('Ready');

    expect(orderApiService.lastFilters).toEqual({ status: 'Ready' });
  });

  it('should show empty state', () => {
    orderApiService.orders = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aun no tienes pedidos');
  });

  it('should navigate to order detail from detail link', () => {
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.detail-button');

    expect(link.getAttribute('href')).toContain('/customer/orders/order-1');
  });

  it('should ask for login when account is missing', () => {
    authService.accountId = null;
    fixture.detectChanges();

    expect(orderApiService.lastCustomerAccountId).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Inicia sesion para consultar tus pedidos');
  });
});

function order(status: OrderStatus = 'Created', branchId = 'branch-1'): OrderResponse {
  return {
    id: 'order-1',
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-1',
    branchId,
    items: [
      {
        productId: 'product-1',
        productNameSnapshot: 'Taco',
        quantity: 2,
        unitPriceSnapshot: 50,
        selectedModifiers: [],
        subtotal: 100
      }
    ],
    subtotal: 100,
    total: 100,
    status,
    createdAt: '2026-05-23T12:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z'
  };
}
