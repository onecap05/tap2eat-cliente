import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Client, type IMessage, type IStompSocket, type StompSubscription } from '@stomp/stompjs';
import { EMPTY, Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { RealtimeOrderEventMessage } from '../models/realtime-notification.models';

export interface RealtimeStompClient {
  connected: boolean;
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
    const topic = this.getRestaurantOrdersTopic(normalizedRestaurantId);

    return new Observable<RealtimeOrderEventMessage>(observer => {
      let stompSubscription: StompSubscription | null = null;
      let isClosed = false;
      let resolvedClient: RealtimeStompClient | null = null;

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

          const subscribeToTopic = () => {
            if (isClosed || stompSubscription) {
              return;
            }

            stompSubscription = client.subscribe(topic, message => {
              const parsedMessage = this.parseOrderMessage(message.body);

              if (parsedMessage) {
                observer.next(parsedMessage);
              }
            });
          };

          if (client.connected) {
            subscribeToTopic();
          } else {
            this.pendingSubscriptions.push(subscribeToTopic);
            client.activate();
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

  public getRestaurantOrdersTopic(restaurantId: string): string {
    return `/topic/restaurants/${restaurantId}/orders`;
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
}
