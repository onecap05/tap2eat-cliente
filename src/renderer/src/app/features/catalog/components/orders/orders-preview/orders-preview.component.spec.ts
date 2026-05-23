import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { OrderResponse, OrderStatus } from '../../../../customer/models/order.models';
import { OrderApiService } from '../../../../customer/services/order-api.service';
import { OrdersPreviewComponent } from './orders-preview.component';

class FakeOrderApiService {
  public lastRestaurantId = '';
  public lastFilters: unknown;
  public lastUpdate: { orderId: string; status: string } | null = null;
  public orders: OrderResponse[] = [
    order('order-1', 'Created', 'branch-1'),
    order('order-2', 'Delivered', 'branch-2')
  ];
  public updateShouldFail = false;

  public getRestaurantOrders(restaurantId: string, filters?: unknown) {
    this.lastRestaurantId = restaurantId;
    this.lastFilters = filters;
    return of(this.orders);
  }

  public updateOrderStatus(orderId: string, status: string) {
    this.lastUpdate = { orderId, status };

    if (this.updateShouldFail) {
      return throwError(() => new Error('update failed'));
    }

    const updatedOrder = {
      ...(this.orders.find(existingOrder => existingOrder.id === orderId) ?? this.orders[0]),
      status
    };

    return of(updatedOrder);
  }
}

describe('OrdersPreviewComponent', () => {
  let fixture: ComponentFixture<OrdersPreviewComponent>;
  let component: OrdersPreviewComponent;
  let orderApiService: FakeOrderApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPreviewComponent],
      providers: [
        { provide: OrderApiService, useClass: FakeOrderApiService }
      ]
    }).compileComponents();

    orderApiService = TestBed.inject(OrderApiService) as unknown as FakeOrderApiService;
    fixture = TestBed.createComponent(OrdersPreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('restaurantId', 'restaurant-1');
    fixture.componentRef.setInput('branches', branches());
  });

  it('should load real orders by restaurant id', () => {
    fixture.detectChanges();

    expect(orderApiService.lastRestaurantId).toBe('restaurant-1');
    expect(component.orders.length).toBe(2);
  });

  it('should filter by status', () => {
    fixture.detectChanges();

    component.setStatusFilter('Created');

    expect(orderApiService.lastFilters).toEqual({ status: 'Created' });
  });

  it('should filter by branch', () => {
    fixture.detectChanges();

    component.setBranchFilter('branch-2');

    expect(component.filteredOrders.length).toBe(1);
    expect(component.filteredOrders[0].branchId).toBe('branch-2');
  });

  it('should show accept and cancel actions for Created orders', () => {
    fixture.detectChanges();

    const actions = component.getActions(component.orders[0]).map(action => action.label);

    expect(actions).toEqual(['Aceptar', 'Cancelar']);
  });

  it('should update order status to Accepted', () => {
    fixture.detectChanges();

    component.updateOrderStatus(component.orders[0], 'Accepted');

    expect(orderApiService.lastUpdate).toEqual({ orderId: 'order-1', status: 'Accepted' });
  });

  it('should not show actions for Delivered orders', () => {
    fixture.detectChanges();

    expect(component.getActions(component.orders[1])).toEqual([]);
  });

  it('should show friendly error when update fails', () => {
    orderApiService.updateShouldFail = true;
    fixture.detectChanges();

    component.updateOrderStatus(component.orders[0], 'Accepted');

    expect(component.actionErrorMessage).toContain('No pudimos actualizar');
  });
});

function order(id: string, status: OrderStatus, branchId: string): OrderResponse {
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

function branches(): IBranchResponse[] {
  return [
    {
      id: 'branch-1',
      restaurantId: 'restaurant-1',
      name: 'Centro',
      formattedAddress: 'Calle 1',
      latitude: 0,
      longitude: 0,
      isMainBranch: true,
      active: true
    },
    {
      id: 'branch-2',
      restaurantId: 'restaurant-1',
      name: 'Norte',
      formattedAddress: 'Calle 2',
      latitude: 0,
      longitude: 0,
      isMainBranch: false,
      active: true
    }
  ];
}
