import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import {
  ensureRealtimeBrowserGlobals,
  REALTIME_STOMP_CLIENT_FACTORY,
  RealtimeNotificationService,
  RealtimeStompClientFactory
} from './realtime-notification.service';

class FakeStompClient {
  public connected = false;
  public active = false;
  public activateCalls = 0;
  public deactivateCalls = 0;
  public subscribeCalls = 0;
  public subscribedDestination = '';
  public onConnect?: () => void;
  public shouldThrowOnSubscribe = false;
  private messageCallback?: (message: { body: string }) => void;

  public activate(): void {
    this.active = true;
    this.activateCalls++;
  }

  public deactivate(): Promise<void> {
    this.deactivateCalls++;
    this.connected = false;
    this.active = false;
    return Promise.resolve();
  }

  public subscribe(destination: string, callback: (message: any) => void) {
    this.subscribeCalls++;
    if (this.shouldThrowOnSubscribe) {
      throw new Error('subscribe failed');
    }

    this.subscribedDestination = destination;
    this.messageCallback = callback;

    return {
      id: 'subscription-1',
      unsubscribe: vi.fn()
    };
  }

  public connect(): void {
    this.connected = true;
    this.active = true;
    this.onConnect?.();
  }

  public receive(rawBody: string): void {
    this.messageCallback?.({ body: rawBody });
  }
}

describe('RealtimeNotificationService', () => {
  let service: RealtimeNotificationService;
  let client: FakeStompClient;
  let factoryCalls: number;

  async function flushPromises(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    client = new FakeStompClient();
    factoryCalls = 0;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: REALTIME_STOMP_CLIENT_FACTORY,
          useValue: (async () => {
            factoryCalls++;
            return client;
          }) satisfies RealtimeStompClientFactory
        }
      ]
    });

    service = TestBed.inject(RealtimeNotificationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should prepare the browser global alias needed by SockJS', () => {
    const globalScope = globalThis as unknown as { global: typeof globalThis | undefined };
    const originalGlobal = globalScope.global;

    globalScope.global = undefined;
    ensureRealtimeBrowserGlobals();

    expect(globalScope.global).toBe(globalThis);

    globalScope.global = originalGlobal;
  });

  it('should use restaurant orders topic', async () => {
    const subscription = service.listenToRestaurantOrders('restaurant-1').subscribe();
    await flushPromises();

    client.connect();

    expect(client.subscribedDestination).toBe('/topic/restaurants/restaurant-1/orders');

    subscription.unsubscribe();
  });

  it('should use customer orders topic', async () => {
    const subscription = service.listenToCustomerOrders('customer-1').subscribe();
    await flushPromises();

    expect(client.activateCalls).toBe(1);

    client.connect();

    expect(client.subscribeCalls).toBe(1);
    expect(client.subscribedDestination).toBe('/topic/customers/customer-1/orders');

    subscription.unsubscribe();
  });

  it('should use customer payments topic', async () => {
    const subscription = service.listenToCustomerPayments('customer-1').subscribe();
    await flushPromises();

    client.connect();

    expect(client.subscribedDestination).toBe('/topic/customers/customer-1/payments');

    subscription.unsubscribe();
  });

  it('should keep one active stomp connection for multiple pending subscriptions', async () => {
    const ordersSubscription = service.listenToCustomerOrders('customer-1').subscribe();
    const paymentsSubscription = service.listenToCustomerPayments('customer-1').subscribe();
    await flushPromises();

    expect(client.activateCalls).toBe(1);

    client.connect();

    expect(client.subscribedDestination).toBe('/topic/customers/customer-1/payments');

    ordersSubscription.unsubscribe();
    paymentsSubscription.unsubscribe();
  });

  it('should warn and complete when stomp subscribe fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const completeSpy = vi.fn();
    client.shouldThrowOnSubscribe = true;

    const subscription = service.listenToCustomerOrders('customer-1').subscribe({
      complete: completeSpy
    });
    await flushPromises();

    client.connect();

    expect(warnSpy).toHaveBeenCalledWith(
      'Realtime notification subscription failed for /topic/customers/customer-1/orders:',
      expect.any(Error)
    );
    expect(completeSpy).toHaveBeenCalled();

    subscription.unsubscribe();
  });

  it('should use restaurant payments topic', async () => {
    const subscription = service.listenToRestaurantPayments('restaurant-1').subscribe();
    await flushPromises();

    client.connect();

    expect(client.subscribedDestination).toBe('/topic/restaurants/restaurant-1/payments');

    subscription.unsubscribe();
  });

  it('should not create a websocket subscription when restaurant id is empty', () => {
    service.listenToRestaurantOrders('').subscribe();

    expect(factoryCalls).toBe(0);
    expect(client.activateCalls).toBe(0);
  });

  it('should not create a websocket subscription when customer account id is empty', () => {
    service.listenToCustomerOrders('').subscribe();

    expect(factoryCalls).toBe(0);
    expect(client.activateCalls).toBe(0);
  });

  it('should not create a websocket payment subscription when customer account id is empty', () => {
    service.listenToCustomerPayments('').subscribe();

    expect(factoryCalls).toBe(0);
    expect(client.activateCalls).toBe(0);
  });

  it('should not create a websocket payment subscription when restaurant id is empty', () => {
    service.listenToRestaurantPayments('').subscribe();

    expect(factoryCalls).toBe(0);
    expect(client.activateCalls).toBe(0);
  });

  it('should ignore invalid JSON without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const nextSpy = vi.fn();
    const subscription = service.listenToRestaurantOrders('restaurant-1').subscribe(nextSpy);
    await flushPromises();
    client.connect();

    expect(() => client.receive('{invalid-json')).not.toThrow();

    expect(nextSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring invalid realtime order message:',
      expect.any(SyntaxError)
    );

    subscription.unsubscribe();
  });

  it('should ignore invalid customer order JSON without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const nextSpy = vi.fn();
    const subscription = service.listenToCustomerOrders('customer-1').subscribe(nextSpy);
    await flushPromises();
    client.connect();

    expect(() => client.receive('{invalid-json')).not.toThrow();

    expect(nextSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring invalid realtime order message:',
      expect.any(SyntaxError)
    );

    subscription.unsubscribe();
  });

  it('should ignore invalid payment JSON without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const nextSpy = vi.fn();
    const subscription = service.listenToCustomerPayments('customer-1').subscribe(nextSpy);
    await flushPromises();
    client.connect();

    expect(() => client.receive('{invalid-json')).not.toThrow();

    expect(nextSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring invalid realtime payment message:',
      expect.any(SyntaxError)
    );

    subscription.unsubscribe();
  });

  it('should ignore invalid restaurant payment JSON without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const nextSpy = vi.fn();
    const subscription = service.listenToRestaurantPayments('restaurant-1').subscribe(nextSpy);
    await flushPromises();
    client.connect();

    expect(() => client.receive('{invalid-json')).not.toThrow();

    expect(nextSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring invalid realtime payment message:',
      expect.any(SyntaxError)
    );

    subscription.unsubscribe();
  });

  it('should emit parsed restaurant order messages', async () => {
    const nextSpy = vi.fn();
    const subscription = service.listenToRestaurantOrders('restaurant-1').subscribe(nextSpy);
    await flushPromises();
    client.connect();

    client.receive(JSON.stringify({
      eventType: 'order.created',
      orderId: 'order-1',
      restaurantId: 'restaurant-1'
    }));

    expect(nextSpy).toHaveBeenCalledWith({
      eventType: 'order.created',
      orderId: 'order-1',
      restaurantId: 'restaurant-1'
    });

    subscription.unsubscribe();
  });
});
