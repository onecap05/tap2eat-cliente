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
  public orders: OrderResponse[] = [order()];

  public getCustomerOrders(customerAccountId: string) {
    this.lastCustomerAccountId = customerAccountId;
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

  it('should show active orders by default', () => {
    orderApiService.orders = [
      order('Created', 'branch-1', 'order-created'),
      order('Delivered', 'branch-1', 'order-delivered')
    ];
    fixture.detectChanges();

    expect(component.selectedTab).toBe('active');
    expect(component.visibleOrders.map(existingOrder => existingOrder.status)).toEqual(['Created']);
  });

  it('should include Created, Accepted, Preparing and Ready in active orders', () => {
    orderApiService.orders = [
      order('Created', 'branch-1', 'order-created'),
      order('Accepted', 'branch-1', 'order-accepted'),
      order('Preparing', 'branch-1', 'order-preparing'),
      order('Ready', 'branch-1', 'order-ready'),
      order('Delivered', 'branch-1', 'order-delivered')
    ];
    fixture.detectChanges();

    expect(component.visibleOrders.map(existingOrder => existingOrder.status)).toEqual([
      'Created',
      'Accepted',
      'Preparing',
      'Ready'
    ]);
  });

  it('should show delivered orders when delivered tab is selected', () => {
    orderApiService.orders = [
      order('Ready', 'branch-1', 'order-ready'),
      order('Delivered', 'branch-1', 'order-delivered')
    ];
    fixture.detectChanges();

    component.setOrderTab('delivered');

    expect(component.visibleOrders.length).toBe(1);
    expect(component.visibleOrders[0].status).toBe('Delivered');
  });

  it('should update list when tab changes', () => {
    orderApiService.orders = [
      order('Created', 'branch-1', 'order-created'),
      order('Delivered', 'branch-1', 'order-delivered')
    ];
    fixture.detectChanges();

    expect(component.visibleOrders[0].status).toBe('Created');

    component.setOrderTab('delivered');

    expect(component.visibleOrders[0].status).toBe('Delivered');
  });

  it('should show Cancelled with cancelled badge in active orders', () => {
    orderApiService.orders = [order('Cancelled', 'branch-1', 'order-cancelled')];
    fixture.detectChanges();

    const badge: HTMLElement = fixture.nativeElement.querySelector('.status-badge.cancelled');

    expect(component.visibleOrders[0].status).toBe('Cancelled');
    expect(badge.textContent).toContain('Cancelado');
  });

  it('should show empty state', () => {
    orderApiService.orders = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No tienes pedidos activos');
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

function order(status: OrderStatus = 'Created', branchId = 'branch-1', id = 'order-1'): OrderResponse {
  return {
    id,
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
