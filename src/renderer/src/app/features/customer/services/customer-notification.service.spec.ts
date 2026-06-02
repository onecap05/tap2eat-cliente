import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, Subject } from 'rxjs';

import { RealtimeOrderEventMessage } from '../../../models/realtime-notification.models';
import { AuthService } from '../../../services/auth.service';
import { RealtimeNotificationService } from '../../../services/realtime-notification.service';
import { CustomerNotificationAudioService } from './customer-notification-audio.service';
import { CustomerNotificationService } from './customer-notification.service';

class FakeAuthService {
  public accountId: string | null = 'customer-1';

  public getAccountId(): string | null {
    return this.accountId;
  }
}

class FakeRealtimeNotificationService {
  public readonly customerOrdersSubject = new Subject<RealtimeOrderEventMessage>();
  public lastCustomerAccountId = '';

  public listenToCustomerOrders(customerAccountId: string): Observable<RealtimeOrderEventMessage> {
    this.lastCustomerAccountId = customerAccountId;
    return this.customerOrdersSubject.asObservable();
  }
}

class FakeCustomerNotificationAudioService {
  public calls = 0;
  public shouldReject = false;

  public playBeep(): Promise<void> {
    this.calls++;
    return this.shouldReject
      ? Promise.reject(new Error('blocked'))
      : Promise.resolve();
  }
}

describe('CustomerNotificationService', () => {
  let service: CustomerNotificationService;
  let authService: FakeAuthService;
  let realtimeNotificationService: FakeRealtimeNotificationService;
  let audioService: FakeCustomerNotificationAudioService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        CustomerNotificationService,
        { provide: AuthService, useClass: FakeAuthService },
        { provide: RealtimeNotificationService, useClass: FakeRealtimeNotificationService },
        { provide: CustomerNotificationAudioService, useClass: FakeCustomerNotificationAudioService }
      ]
    });

    service = TestBed.inject(CustomerNotificationService);
    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;
    realtimeNotificationService = TestBed.inject(RealtimeNotificationService) as unknown as FakeRealtimeNotificationService;
    audioService = TestBed.inject(CustomerNotificationAudioService) as unknown as FakeCustomerNotificationAudioService;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should add a notification when an order status event arrives', async () => {
    service.initializeForCurrentCustomer();

    realtimeNotificationService.customerOrdersSubject.next(orderEvent('Accepted'));

    const notifications = await firstValueFrom(service.notifications$);
    const unreadCount = await firstValueFrom(service.unreadCount$);

    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toContain('El restaurante acept\u00f3 tu pedido.');
    expect(notifications[0].message).toContain('Listo para recoger aproximadamente');
    expect(unreadCount).toBe(1);
    expect(audioService.calls).toBe(1);
  });

  it('should subscribe to customer order realtime events with the logged account id', () => {
    authService.accountId = 'f15ee490-ba60-4828-b3d9-ba9bc54129df';

    service.initializeForCurrentCustomer();

    expect(realtimeNotificationService.lastCustomerAccountId)
      .toBe('f15ee490-ba60-4828-b3d9-ba9bc54129df');
  });

  it('should warn and skip realtime subscription when account id is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    authService.accountId = null;

    service.initializeForCurrentCustomer();

    expect(realtimeNotificationService.lastCustomerAccountId).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(
      'Customer realtime notifications were not started because accountId is missing.'
    );
  });

  it('should add a notification when the realtime payload uses newStatus', async () => {
    service.initializeForCurrentCustomer();

    realtimeNotificationService.customerOrdersSubject.next({
      ...orderEvent('Accepted'),
      status: null,
      newStatus: 'Accepted'
    });

    const notifications = await firstValueFrom(service.notifications$);

    expect(notifications.length).toBe(1);
    expect(notifications[0].status).toBe('Accepted');
  });

  it('should ignore duplicated realtime events', async () => {
    service.initializeForCurrentCustomer();
    const event = orderEvent('Ready');

    realtimeNotificationService.customerOrdersSubject.next(event);
    realtimeNotificationService.customerOrdersSubject.next(event);

    const notifications = await firstValueFrom(service.notifications$);

    expect(notifications.length).toBe(1);
  });

  it('should mark a notification as read', async () => {
    service.initializeForCurrentCustomer();
    realtimeNotificationService.customerOrdersSubject.next(orderEvent('Preparing'));
    const [notification] = await firstValueFrom(service.notifications$);

    service.markAsRead(notification.id);

    const unreadCount = await firstValueFrom(service.unreadCount$);
    expect(unreadCount).toBe(0);
  });

  it('should mark all notifications as read', async () => {
    service.initializeForCurrentCustomer();
    realtimeNotificationService.customerOrdersSubject.next(orderEvent('Preparing', 'order-1'));
    realtimeNotificationService.customerOrdersSubject.next(orderEvent('Ready', 'order-2'));

    service.markAllAsRead();

    const unreadCount = await firstValueFrom(service.unreadCount$);
    expect(unreadCount).toBe(0);
  });

  it('should persist notifications in localStorage', async () => {
    service.initializeForCurrentCustomer();
    realtimeNotificationService.customerOrdersSubject.next(orderEvent('Cancelled'));

    const storedValue = localStorage.getItem('tap2eat.customer.notifications.customer-1');

    expect(storedValue).toContain('Tu pedido fue cancelado.');
  });

  it('should load persisted notifications from localStorage', async () => {
    localStorage.setItem('tap2eat.customer.notifications.customer-1', JSON.stringify([
      {
        id: 'stored-1',
        orderId: 'order-1',
        title: 'Pedido #ORDER-1',
        message: 'Tu pedido esta listo para recoger.',
        status: 'Ready',
        createdAt: '2026-05-23T12:20:00Z',
        read: false
      }
    ]));

    service.initializeForCurrentCustomer();

    const unreadCount = await firstValueFrom(service.unreadCount$);
    expect(unreadCount).toBe(1);
  });

  it('should keep working when notification sound is blocked', async () => {
    audioService.shouldReject = true;
    service.initializeForCurrentCustomer();

    realtimeNotificationService.customerOrdersSubject.next(orderEvent('Delivered'));
    await Promise.resolve();

    const notifications = await firstValueFrom(service.notifications$);
    expect(notifications.length).toBe(1);
  });
});

function orderEvent(status: string, orderId = 'order-1'): RealtimeOrderEventMessage {
  return {
    eventType: status === 'Created' ? 'order.created' : 'order.status.changed',
    orderId,
    customerAccountId: 'customer-1',
    restaurantId: 'restaurant-1',
    branchId: 'branch-1',
    status,
    newStatus: status,
    previousStatus: 'Created',
    estimatedPreparationMinutes: status === 'Accepted' ? 20 : null,
    estimatedReadyAt: status === 'Accepted' ? '2026-05-23T12:20:00Z' : null,
    occurredAt: `2026-05-23T12:${status.length.toString().padStart(2, '0')}:00Z`
  };
}
