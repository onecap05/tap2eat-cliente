import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { OrderResponse, OrderStatus } from '../../../../customer/models/order.models';
import { OrderApiService } from '../../../../customer/services/order-api.service';
import { RealtimeOrderEventMessage } from '../../../../../models/realtime-notification.models';
import { RealtimeNotificationService } from '../../../../../services/realtime-notification.service';
import { OrdersPreviewComponent } from './orders-preview.component';

class FakeOrderApiService {
  public lastRestaurantId = '';
  public lastFilters: unknown;
  public lastUpdate: { orderId: string; status: string } | null = null;
  public getRestaurantOrdersCalls = 0;
  public orders: OrderResponse[] = [
    order('order-1', 'Created', 'branch-long-8f7a'),
    order('order-2', 'Delivered', 'branch-2')
  ];
  public updateShouldFail = false;

  public getRestaurantOrders(restaurantId: string, filters?: unknown) {
    this.getRestaurantOrdersCalls++;
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

class FakeRealtimeNotificationService {
  public lastRestaurantId = '';
  public listenCalls = 0;
  public activeSubscriptions = 0;
  private readonly restaurantOrdersSubject = new Subject<RealtimeOrderEventMessage>();

  public listenToRestaurantOrders(restaurantId: string): Observable<RealtimeOrderEventMessage> {
    this.listenCalls++;
    this.lastRestaurantId = restaurantId;

    return new Observable(observer => {
      this.activeSubscriptions++;
      const subscription = this.restaurantOrdersSubject.subscribe(observer);

      return () => {
        this.activeSubscriptions--;
        subscription.unsubscribe();
      };
    });
  }

  public emitRestaurantOrderEvent(event: RealtimeOrderEventMessage): void {
    this.restaurantOrdersSubject.next(event);
  }
}

describe('OrdersPreviewComponent', () => {
  let fixture: ComponentFixture<OrdersPreviewComponent>;
  let component: OrdersPreviewComponent;
  let orderApiService: FakeOrderApiService;
  let realtimeNotificationService: FakeRealtimeNotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPreviewComponent],
      providers: [
        { provide: OrderApiService, useClass: FakeOrderApiService },
        { provide: RealtimeNotificationService, useClass: FakeRealtimeNotificationService }
      ]
    }).compileComponents();

    orderApiService = TestBed.inject(OrderApiService) as unknown as FakeOrderApiService;
    realtimeNotificationService = TestBed.inject(RealtimeNotificationService) as unknown as FakeRealtimeNotificationService;
    fixture = TestBed.createComponent(OrdersPreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('restaurantId', 'restaurant-long-1384d0');
    fixture.componentRef.setInput('restaurantName', 'Tacos Owner');
    fixture.componentRef.setInput('branches', branches());
  });

  it('should load real orders by restaurant id', () => {
    fixture.detectChanges();

    expect(orderApiService.lastRestaurantId).toBe('restaurant-long-1384d0');
    expect(component.orders.length).toBe(2);
  });

  it('should subscribe to realtime orders for restaurant id', () => {
    fixture.detectChanges();

    expect(realtimeNotificationService.listenCalls).toBe(1);
    expect(realtimeNotificationService.lastRestaurantId).toBe('restaurant-long-1384d0');
  });

  it('should reload orders when realtime order event matches restaurant id', () => {
    fixture.detectChanges();
    const initialCalls = orderApiService.getRestaurantOrdersCalls;

    realtimeNotificationService.emitRestaurantOrderEvent(realtimeOrderEvent('order.created', 'restaurant-long-1384d0'));

    expect(orderApiService.getRestaurantOrdersCalls).toBe(initialCalls + 1);
  });

  it('should reload orders when realtime order status event matches restaurant id', () => {
    fixture.detectChanges();
    const initialCalls = orderApiService.getRestaurantOrdersCalls;

    realtimeNotificationService.emitRestaurantOrderEvent(realtimeOrderEvent('order.status.changed', 'restaurant-long-1384d0'));

    expect(orderApiService.getRestaurantOrdersCalls).toBe(initialCalls + 1);
  });

  it('should ignore realtime order event from another restaurant', () => {
    fixture.detectChanges();
    const initialCalls = orderApiService.getRestaurantOrdersCalls;

    realtimeNotificationService.emitRestaurantOrderEvent(realtimeOrderEvent('order.created', 'another-restaurant'));

    expect(orderApiService.getRestaurantOrdersCalls).toBe(initialCalls);
  });

  it('should reload with selected status filter when realtime event arrives', () => {
    fixture.detectChanges();
    component.setStatusFilter('Created');

    realtimeNotificationService.emitRestaurantOrderEvent(realtimeOrderEvent('order.created', 'restaurant-long-1384d0'));

    expect(orderApiService.lastFilters).toEqual({ status: 'Created' });
  });

  it('should unsubscribe from realtime orders on destroy', () => {
    fixture.detectChanges();

    expect(realtimeNotificationService.activeSubscriptions).toBe(1);

    fixture.destroy();

    expect(realtimeNotificationService.activeSubscriptions).toBe(0);
  });

  it('should load initial orders without filters when status is all', () => {
    fixture.detectChanges();

    expect(orderApiService.lastRestaurantId).toBe('restaurant-long-1384d0');
    expect(orderApiService.lastFilters).toBeUndefined();
  });

  it('should pass selected status filter to restaurant orders request', () => {
    fixture.detectChanges();

    component.setStatusFilter('Created');

    expect(orderApiService.lastRestaurantId).toBe('restaurant-long-1384d0');
    expect(orderApiService.lastFilters).toEqual({ status: 'Created' });
  });

  it('should clear filters when status changes back to all', () => {
    fixture.detectChanges();

    component.setStatusFilter('Created');
    component.setStatusFilter('all');

    expect(orderApiService.lastRestaurantId).toBe('restaurant-long-1384d0');
    expect(orderApiService.lastFilters).toBeUndefined();
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

  it('should show branch and restaurant names when available', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tacos Owner');
    expect(fixture.nativeElement.textContent).toContain('Centro');
  });

  it('should show readable customer fallback and hide raw customer id', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Cliente #E95B7');
    expect(text).not.toContain('customer-long-e95b7');
  });

  it('should show branch fallback when branch name is unavailable', () => {
    fixture.componentRef.setInput('branches', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sucursal #8F7A');
    expect(fixture.nativeElement.textContent).not.toContain('branch-long-8f7a');
  });
});

function order(id: string, status: OrderStatus, branchId: string): OrderResponse {
  return {
    id,
    customerAccountId: 'customer-long-e95b7',
    restaurantId: 'restaurant-long-1384d0',
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
      id: 'branch-long-8f7a',
      restaurantId: 'restaurant-long-1384d0',
      name: 'Centro',
      formattedAddress: 'Calle 1',
      latitude: 0,
      longitude: 0,
      isMainBranch: true,
      active: true
    },
    {
      id: 'branch-2',
      restaurantId: 'restaurant-long-1384d0',
      name: 'Norte',
      formattedAddress: 'Calle 2',
      latitude: 0,
      longitude: 0,
      isMainBranch: false,
      active: true
    }
  ];
}

function realtimeOrderEvent(eventType: string, restaurantId: string): RealtimeOrderEventMessage {
  return {
    eventType,
    orderId: 'order-realtime-1',
    customerAccountId: 'customer-long-e95b7',
    restaurantId,
    branchId: 'branch-long-8f7a',
    status: 'Created',
    occurredAt: '2026-05-23T12:00:00Z'
  };
}
