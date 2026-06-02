import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Client, type IMessage, type IStompSocket, type StompSubscription } from '@stomp/stompjs';
import { EMPTY, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  RealtimeOrderEventMessage,
  RealtimePaymentEventMessage
} from '../models/realtime-notification.models';

export interface RealtimeStompClient {
  connected: boolean;
  active?: boolean;
  onConnect?: () => void;
  onStompError?: (frame: unknown) => void;
  onWebSocketError?: (event: unknown) => void;
  activate(): void;
  deactivate(): Promise<void>;
  subscribe(destination: string, callback: (message: IMessage) => void): StompSubscription;
}

export type RealtimeStompClientFactory = () => Promise<RealtimeStompClient>;

type SockJsConstructor = new (url: string) => IStompSocket;

export function ensureRealtimeBrowserGlobals(): void {
  const globalScope = globalThis as typeof globalThis & { global?: typeof globalThis };
  globalScope.global ??= globalThis;
}

export const REALTIME_STOMP_CLIENT_FACTORY = new InjectionToken<RealtimeStompClientFactory>(
  'REALTIME_STOMP_CLIENT_FACTORY',
  {
    providedIn: 'root',
    factory: () => async () => {
      ensureRealtimeBrowserGlobals();
      const sockJsModule = await import('sockjs-client');
      const normalizedModule = sockJsModule as unknown as { default?: SockJsConstructor } & SockJsConstructor;
      const SockJS = normalizedModule.default ?? normalizedModule;

      return new Client({
        webSocketFactory: () => new SockJS(environment.notificationWsUrl),
        reconnectDelay: 5000,
        debug: () => undefined
      }) as RealtimeStompClient;
    }
  }
);

@Injectable({
  providedIn: 'root'
})
export class RealtimeNotificationService {
  private client: RealtimeStompClient | null = null;
  private clientPromise: Promise<RealtimeStompClient> | null = null;
  private pendingSubscriptions: Array<() => void> = [];
  private activeSubscriptionCount = 0;

  constructor(
    @Inject(REALTIME_STOMP_CLIENT_FACTORY)
    private readonly clientFactory: RealtimeStompClientFactory
  ) {}

  public listenToRestaurantOrders(restaurantId: string): Observable<RealtimeOrderEventMessage> {
    if (!restaurantId?.trim()) {
      return EMPTY;
    }

    const normalizedRestaurantId = restaurantId.trim();
    return this.listenToOrderTopic(this.getRestaurantOrdersTopic(normalizedRestaurantId));
  }

  public listenToCustomerOrders(customerAccountId: string): Observable<RealtimeOrderEventMessage> {
    if (!customerAccountId?.trim()) {
      return EMPTY;
    }

    const normalizedCustomerAccountId = customerAccountId.trim();
    return this.listenToOrderTopic(this.getCustomerOrdersTopic(normalizedCustomerAccountId));
  }

  public listenToCustomerPayments(customerAccountId: string): Observable<RealtimePaymentEventMessage> {
    if (!customerAccountId?.trim()) {
      return EMPTY;
    }

    const normalizedCustomerAccountId = customerAccountId.trim();
    return this.listenToPaymentTopic(this.getCustomerPaymentsTopic(normalizedCustomerAccountId));
  }

  public listenToRestaurantPayments(restaurantId: string): Observable<RealtimePaymentEventMessage> {
    if (!restaurantId?.trim()) {
      return EMPTY;
    }

    const normalizedRestaurantId = restaurantId.trim();
    return this.listenToPaymentTopic(this.getRestaurantPaymentsTopic(normalizedRestaurantId));
  }

  public getRestaurantOrdersTopic(restaurantId: string): string {
    return `/topic/restaurants/${restaurantId}/orders`;
  }

  public getCustomerOrdersTopic(customerAccountId: string): string {
    return `/topic/customers/${customerAccountId}/orders`;
  }

  public getCustomerPaymentsTopic(customerAccountId: string): string {
    return `/topic/customers/${customerAccountId}/payments`;
  }

  public getRestaurantPaymentsTopic(restaurantId: string): string {
    return `/topic/restaurants/${restaurantId}/payments`;
  }

  private listenToOrderTopic(topic: string): Observable<RealtimeOrderEventMessage> {
    return this.listenToTopic(topic, rawBody => this.parseOrderMessage(rawBody));
  }

  private listenToPaymentTopic(topic: string): Observable<RealtimePaymentEventMessage> {
    return this.listenToTopic(topic, rawBody => this.parsePaymentMessage(rawBody));
  }

  private listenToTopic<TMessage>(
    topic: string,
    parseMessage: (rawBody: string) => TMessage | null
  ): Observable<TMessage> {
    return new Observable<TMessage>(observer => {
      let stompSubscription: StompSubscription | null = null;
      let isClosed = false;
      let resolvedClient: RealtimeStompClient | null = null;
      let subscribeToTopic: (() => void) | null = null;

      this.activeSubscriptionCount++;

      void this.getClient()
        .then(client => {
          if (isClosed) {
            if (this.activeSubscriptionCount === 0) {
              void client.deactivate().catch(error => {
                console.warn('Realtime notification disconnect failed:', error);
              });
              this.client = null;
              this.clientPromise = null;
              this.pendingSubscriptions = [];
            }
            return;
          }

          resolvedClient = client;

          subscribeToTopic = () => {
            if (isClosed || stompSubscription) {
              return;
            }

            try {
              stompSubscription = client.subscribe(topic, message => {
                const parsedMessage = parseMessage(message.body);

                if (parsedMessage) {
                  observer.next(parsedMessage);
                }
              });
            } catch (error) {
              console.warn(`Realtime notification subscription failed for ${topic}:`, error);
              observer.complete();
            }
          };

          if (client.connected) {
            subscribeToTopic();
          } else {
            this.pendingSubscriptions.push(subscribeToTopic);
            if (!client.active) {
              client.activate();
            }
          }
        })
        .catch(error => {
          this.activeSubscriptionCount = Math.max(0, this.activeSubscriptionCount - 1);
          this.client = null;
          this.clientPromise = null;
          console.warn('Realtime notification connection failed:', error);
          observer.complete();
        });

      return () => {
        isClosed = true;
        if (subscribeToTopic) {
          this.pendingSubscriptions = this.pendingSubscriptions.filter(callback => callback !== subscribeToTopic);
        }
        stompSubscription?.unsubscribe();
        this.activeSubscriptionCount = Math.max(0, this.activeSubscriptionCount - 1);

        if (this.activeSubscriptionCount === 0 && resolvedClient) {
          void resolvedClient.deactivate().catch(error => {
            console.warn('Realtime notification disconnect failed:', error);
          });
          this.client = null;
          this.clientPromise = null;
          this.pendingSubscriptions = [];
        }
      };
    });
  }

  private getClient(): Promise<RealtimeStompClient> {
    if (this.client) {
      return Promise.resolve(this.client);
    }

    this.clientPromise ??= this.clientFactory()
      .then(client => {
        this.client = client;
        this.client.onConnect = () => {
          const pendingSubscriptions = [...this.pendingSubscriptions];
          this.pendingSubscriptions = [];
          pendingSubscriptions.forEach(callback => callback());
        };
        this.client.onStompError = error => {
          console.warn('Realtime notification broker error:', error);
        };
        this.client.onWebSocketError = error => {
          console.warn('Realtime notification socket error:', error);
        };

        return this.client;
      })
      .catch(error => {
        this.clientPromise = null;
        throw error;
      });

    return this.clientPromise;
  }

  private parseOrderMessage(rawBody: string): RealtimeOrderEventMessage | null {
    try {
      return JSON.parse(rawBody) as RealtimeOrderEventMessage;
    } catch (error) {
      console.warn('Ignoring invalid realtime order message:', error);
      return null;
    }
  }

  private parsePaymentMessage(rawBody: string): RealtimePaymentEventMessage | null {
    try {
      return JSON.parse(rawBody) as RealtimePaymentEventMessage;
    } catch (error) {
      console.warn('Ignoring invalid realtime payment message:', error);
      return null;
    }
  }
}
