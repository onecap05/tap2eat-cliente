import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { OrderResponse, OrderStatus } from '../../../../customer/models/order.models';
import { OrderApiService } from '../../../../customer/services/order-api.service';
import { PaymentApiService } from '../../../../customer/services/payment-api.service';
import {
  RealtimeOrderEventMessage,
  RealtimePaymentEventMessage
} from '../../../../../models/realtime-notification.models';
import { RealtimeNotificationService } from '../../../../../services/realtime-notification.service';
import { OrdersPreviewComponent } from './orders-preview.component';

class FakeOrderApiService {
  public lastRestaurantId = '';
  public lastFilters: unknown;
  public lastUpdate: { orderId: string; status: string; estimatedPreparationMinutes?: number | null } | null = null;
  public getRestaurantOrdersCalls = 0;
  public orders: OrderResponse[] = [
    order('order-1', 'Created', 'branch-long-8f7a'),
    order('order-ready', 'Ready', 'branch-long-8f7a'),
    order('order-2', 'Delivered', 'branch-2')
  ];
  public updateShouldFail = false;

  public getRestaurantOrders(restaurantId: string, filters?: unknown) {
    this.getRestaurantOrdersCalls++;
    this.lastRestaurantId = restaurantId;
    this.lastFilters = filters;
    return of(this.orders);
  }

  public updateOrderStatus(orderId: string, status: string, estimatedPreparationMinutes?: number | null) {
    this.lastUpdate = { orderId, status, estimatedPreparationMinutes };

    if (this.updateShouldFail) {
      return throwError(() => new Error('update failed'));
    }

    const updatedOrder = {
      ...(this.orders.find(existingOrder => existingOrder.id === orderId) ?? this.orders[0]),
      status,
      estimatedPreparationMinutes: estimatedPreparationMinutes ?? null,
      estimatedReadyAt: estimatedPreparationMinutes ? '2026-05-23T12:20:00Z' : null
    };

    return of(updatedOrder);
  }
}

class FakePaymentApiService {
  public getPaymentByOrderIdCalls = 0;
  public confirmCashPaymentCalls = 0;
  public lastConfirmRequest: { paymentId: string; request: { amountReceived: number } } | null = null;
  public paymentStatus = 'Approved';

  public getPaymentByOrderId(orderId: string) {
    this.getPaymentByOrderIdCalls++;

    return of({
      id: `payment-${orderId}`,
      orderId,
      customerAccountId: 'customer-long-e95b7',
      restaurantId: 'restaurant-long-1384d0',
      branchId: 'branch-long-8f7a',
      amount: 100,
      currency: 'MXN',
      status: this.paymentStatus,
      provider: 'PAYPAL',
      createdAt: '2026-05-23T12:00:00Z',
      updatedAt: '2026-05-23T12:00:00Z'
    });
  }

  public confirmCashPayment(paymentId: string, request: { amountReceived: number }) {
    this.confirmCashPaymentCalls++;
    this.lastConfirmRequest = { paymentId, request };

    return of({
      id: paymentId,
      orderId: 'order-ready',
      customerAccountId: 'customer-long-e95b7',
      restaurantId: 'restaurant-long-1384d0',
      branchId: 'branch-long-8f7a',
      amount: 100,
      currency: 'MXN',
      status: 'Approved',
      provider: 'CASH',
      amountReceived: request.amountReceived,
      changeAmount: request.amountReceived - 100,
      createdAt: '2026-05-23T12:00:00Z',
      updatedAt: '2026-05-23T12:00:00Z'
    });
  }
}

class FakeRealtimeNotificationService {
  public lastRestaurantId = '';
  public lastPaymentRestaurantId = '';
  public listenCalls = 0;
  public paymentListenCalls = 0;
  public activeSubscriptions = 0;
  private readonly restaurantOrdersSubject = new Subject<RealtimeOrderEventMessage>();
  private readonly restaurantPaymentsSubject = new Subject<RealtimePaymentEventMessage>();

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

  public listenToRestaurantPayments(restaurantId: string): Observable<RealtimePaymentEventMessage> {
    this.paymentListenCalls++;
    this.lastPaymentRestaurantId = restaurantId;

    return new Observable(observer => {
      this.activeSubscriptions++;
      const subscription = this.restaurantPaymentsSubject.subscribe(observer);

      return () => {
        this.activeSubscriptions--;
        subscription.unsubscribe();
      };
    });
  }

  public emitRestaurantOrderEvent(event: RealtimeOrderEventMessage): void {
    this.restaurantOrdersSubject.next(event);
  }

  public emitRestaurantPaymentEvent(event: RealtimePaymentEventMessage): void {
    this.restaurantPaymentsSubject.next(event);
  }
}

describe('OrdersPreviewComponent', () => {
  let fixture: ComponentFixture<OrdersPreviewComponent>;
  let component: OrdersPreviewComponent;
  let orderApiService: FakeOrderApiService;
  let paymentApiService: FakePaymentApiService;
  let realtimeNotificationService: FakeRealtimeNotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPreviewComponent],
      providers: [
        { provide: OrderApiService, useClass: FakeOrderApiService },
        { provide: PaymentApiService, useClass: FakePaymentApiService },
        { provide: RealtimeNotificationService, useClass: FakeRealtimeNotificationService }
      ]
    }).compileComponents();

    orderApiService = TestBed.inject(OrderApiService) as unknown as FakeOrderApiService;
    paymentApiService = TestBed.inject(PaymentApiService) as unknown as FakePaymentApiService;
    realtimeNotificationService = TestBed.inject(RealtimeNotificationService) as unknown as FakeRealtimeNotificationService;
    fixture = TestBed.createComponent(OrdersPreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('restaurantId', 'restaurant-long-1384d0');
    fixture.componentRef.setInput('restaurantName', 'Tacos Owner');
    fixture.componentRef.setInput('branches', branches());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load real orders by restaurant id', () => {
    fixture.detectChanges();

    expect(orderApiService.lastRestaurantId).toBe('restaurant-long-1384d0');
    expect(component.orders.length).toBe(3);
  });

  it('should subscribe to realtime orders for restaurant id', () => {
    fixture.detectChanges();

    expect(realtimeNotificationService.listenCalls).toBe(1);
    expect(realtimeNotificationService.lastRestaurantId).toBe('restaurant-long-1384d0');
  });

  it('should subscribe to realtime payments for restaurant id', () => {
    fixture.detectChanges();

    expect(realtimeNotificationService.paymentListenCalls).toBe(1);
    expect(realtimeNotificationService.lastPaymentRestaurantId).toBe('restaurant-long-1384d0');
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

  it('should reload orders when realtime payment event matches restaurant id', () => {
    fixture.detectChanges();
    const initialCalls = orderApiService.getRestaurantOrdersCalls;

    realtimeNotificationService.emitRestaurantPaymentEvent(realtimePaymentEvent('payment.approved', 'restaurant-long-1384d0'));

    expect(orderApiService.getRestaurantOrdersCalls).toBe(initialCalls + 1);
  });

  it('should ignore realtime payment event from another restaurant', () => {
    fixture.detectChanges();
    const initialCalls = orderApiService.getRestaurantOrdersCalls;

    realtimeNotificationService.emitRestaurantPaymentEvent(realtimePaymentEvent('payment.rejected', 'another-restaurant'));

    expect(orderApiService.getRestaurantOrdersCalls).toBe(initialCalls);
  });

  it('should reload with selected status filter when realtime event arrives', () => {
    fixture.detectChanges();
    component.setStatusFilter('Created');

    realtimeNotificationService.emitRestaurantOrderEvent(realtimeOrderEvent('order.created', 'restaurant-long-1384d0'));

    expect(orderApiService.lastFilters).toEqual({ status: 'Created' });
  });

  it('should reload with selected status filter when realtime payment event arrives', () => {
    fixture.detectChanges();
    component.setStatusFilter('Created');

    realtimeNotificationService.emitRestaurantPaymentEvent(realtimePaymentEvent('payment.cancelled', 'restaurant-long-1384d0'));

    expect(orderApiService.lastFilters).toEqual({ status: 'Created' });
  });

  it('should unsubscribe from realtime orders and payments on destroy', () => {
    fixture.detectChanges();

    expect(realtimeNotificationService.activeSubscriptions).toBe(2);

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
    const confirmSpy = vi.spyOn(window, 'confirm');

    component.updateOrderStatus(component.orders[0], 'Accepted');

    expect(orderApiService.lastUpdate).toEqual({
      orderId: 'order-1',
      status: 'Accepted',
      estimatedPreparationMinutes: 15
    });
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should send custom estimated preparation minutes when accepting an order', () => {
    fixture.detectChanges();
    component.selectedPreparationTimeOption = 'custom';
    component.customPreparationMinutes = 22;

    component.updateOrderStatus(component.orders[0], 'Accepted');

    expect(orderApiService.lastUpdate).toEqual({
      orderId: 'order-1',
      status: 'Accepted',
      estimatedPreparationMinutes: 22
    });
  });

  it('should block accepting an order with invalid custom preparation minutes', () => {
    fixture.detectChanges();
    component.selectedPreparationTimeOption = 'custom';
    component.customPreparationMinutes = -5;

    component.updateOrderStatus(component.orders[0], 'Accepted');

    expect(orderApiService.lastUpdate).toBeNull();
    expect(component.actionErrorMessage).toContain('tiempo estimado');
  });

  it('should not ask for confirmation when updating to non-cancelled statuses', () => {
    fixture.detectChanges();
    const confirmSpy = vi.spyOn(window, 'confirm');

    (['Accepted', 'Preparing', 'Ready'] as OrderStatus[]).forEach(status => {
      component.updateOrderStatus(component.orders[0], status);
      expect(orderApiService.lastUpdate).toEqual({
        orderId: 'order-1',
        status,
        estimatedPreparationMinutes: status === 'Accepted' ? 15 : undefined
      });
    });

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('should not update order status to Cancelled when confirmation is rejected', () => {
    fixture.detectChanges();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.updateOrderStatus(component.orders[0], 'Cancelled');

    expect(confirmSpy).toHaveBeenCalledWith(
      '¿Seguro que deseas cancelar este pedido? El cliente será notificado del cambio.'
    );
    expect(orderApiService.lastUpdate).toBeNull();
    expect(component.updatingOrderId).toBeNull();
  });

  it('should update order status to Cancelled when confirmation is accepted', () => {
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.updateOrderStatus(component.orders[0], 'Cancelled');

    expect(orderApiService.lastUpdate).toEqual({
      orderId: 'order-1',
      status: 'Cancelled',
      estimatedPreparationMinutes: undefined
    });
  });

  it('should update local orders and selected order when cancellation succeeds', () => {
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.openOrderDetail(component.orders[0]);

    component.updateOrderStatus(component.orders[0], 'Cancelled');

    expect(component.orders.find(existingOrder => existingOrder.id === 'order-1')?.status).toBe('Cancelled');
    expect(component.selectedOrder?.status).toBe('Cancelled');
    expect(component.actionErrorMessage).toBe('');
    expect(component.updatingOrderId).toBeNull();
  });

  it('should show friendly error when cancellation update fails', () => {
    orderApiService.updateShouldFail = true;
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.updateOrderStatus(component.orders[0], 'Cancelled');

    expect(component.actionErrorMessage).toContain('No pudimos actualizar');
    expect(component.updatingOrderId).toBeNull();
  });

  it('should keep selected status filter when cancelling an order', () => {
    fixture.detectChanges();
    component.setStatusFilter('Created');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.updateOrderStatus(component.orders[0], 'Cancelled');

    expect(component.selectedStatus).toBe('Created');
  });

  it('should not show actions for Delivered orders', () => {
    fixture.detectChanges();

    expect(component.getActions(component.orders[2])).toEqual([]);
  });

  it('should show Generate ticket for Ready orders and hide Deliver before ticket', () => {
    fixture.detectChanges();
    component.openOrderDetail(component.orders[1]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Generar ticket');
    expect(text).not.toContain('Entregar');
  });

  it('should block delivering Ready order before ticket is generated', () => {
    fixture.detectChanges();

    component.updateOrderStatus(component.orders[1], 'Delivered');

    expect(orderApiService.lastUpdate).toBeNull();
    expect(component.actionErrorMessage).toContain('Primero genera');
  });

  it('should generate online ticket without asking for cash amount', () => {
    fixture.detectChanges();
    const readyOrder = component.orders[1];

    component.beginTicketFlow(readyOrder);
    fixture.detectChanges();

    expect(paymentApiService.getPaymentByOrderIdCalls).toBe(1);
    expect(component.generatedTicket?.paymentMethodLabel).toBe('Online');
    expect(component.generatedTicket?.changeAmount).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Cantidad recibida');
  });

  it('should print only the generated ticket with a safe document title', () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    const readyOrder = component.orders[1];
    const writtenDocuments: string[] = [];
    const printWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn((html: string) => writtenDocuments.push(html)),
        close: vi.fn()
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn()
    } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow);
    const originalTitle = document.title;

    component.openOrderDetail(readyOrder);
    component.beginTicketFlow(readyOrder);
    fixture.detectChanges();

    component.printTicket();
    vi.runAllTimers();

    expect(openSpy).toHaveBeenCalled();
    expect(writtenDocuments[0]).toContain('ticket-print-area');
    expect(writtenDocuments[0]).toContain('<title>ticket-ER-READY-tacos-owner-tap2eat-');
    expect(writtenDocuments[0]).not.toContain('Pedidos del restaurante');
    expect(printWindow.print).toHaveBeenCalled();
    expect(document.title).toBe(originalTitle);

    vi.useRealTimers();
  });

  it('should calculate change for cash order with suggested amount', () => {
    fixture.detectChanges();
    const readyOrder = {
      ...component.orders[1],
      paymentMethod: 'Cash',
      cashPaymentType: 'KnownAmount',
      cashAmountProvided: 150,
      estimatedChange: 50
    };

    component.beginTicketFlow(readyOrder);
    component.confirmCashTicket(readyOrder);

    expect(paymentApiService.lastConfirmRequest?.request.amountReceived).toBe(150);
    expect(component.generatedTicket?.changeAmount).toBe(50);
  });

  it('should ask amount received for cash order without suggested amount', () => {
    fixture.detectChanges();
    const readyOrder = {
      ...component.orders[1],
      paymentMethod: 'Cash',
      cashPaymentType: 'UnknownAmount',
      cashAmountProvided: null,
      estimatedChange: null
    };

    component.openOrderDetail(readyOrder);
    component.beginTicketFlow(readyOrder);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El cliente no especificó');
    expect(fixture.nativeElement.textContent).toContain('Cantidad recibida');
  });

  it('should reject cash ticket when amount received is lower than total', () => {
    fixture.detectChanges();
    const readyOrder = {
      ...component.orders[1],
      paymentMethod: 'Cash',
      cashPaymentType: 'UnknownAmount'
    };
    component.beginTicketFlow(readyOrder);
    component.cashAmountReceived = 50;

    component.confirmCashTicket(readyOrder);

    expect(paymentApiService.confirmCashPaymentCalls).toBe(0);
    expect(component.actionErrorMessage).toContain('mayor o igual');
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
    paymentMethod: 'Online',
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

function realtimePaymentEvent(eventType: string, restaurantId: string): RealtimePaymentEventMessage {
  return {
    eventType,
    paymentId: 'payment-realtime-1',
    orderId: 'order-1',
    customerAccountId: 'customer-long-e95b7',
    restaurantId,
    branchId: 'branch-long-8f7a',
    amount: 100,
    currency: 'MXN',
    status: 'Approved',
    occurredAt: '2026-05-23T12:00:00Z'
  };
}
