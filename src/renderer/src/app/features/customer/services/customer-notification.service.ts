import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Subscription } from 'rxjs';

import { RealtimeOrderEventMessage } from '../../../models/realtime-notification.models';
import { AuthService } from '../../../services/auth.service';
import { RealtimeNotificationService } from '../../../services/realtime-notification.service';
import { CustomerOrderNotification } from '../models/customer-notification.models';
import { OrderStatus } from '../models/order.models';
import { CustomerNotificationAudioService } from './customer-notification-audio.service';

const NOTIFICATION_STORAGE_PREFIX = 'tap2eat.customer.notifications';
const ORDER_STATUS_MESSAGES: Record<OrderStatus, string> = {
  Created: 'Tu pedido fue recibido.',
  Accepted: 'El restaurante acept\u00f3 tu pedido.',
  Preparing: 'Tu pedido est\u00e1 en preparaci\u00f3n.',
  Ready: 'Tu pedido est\u00e1 listo para recoger.',
  Delivered: 'Tu pedido fue marcado como recogido.',
  Cancelled: 'Tu pedido fue cancelado.'
};

@Injectable({
  providedIn: 'root'
})
export class CustomerNotificationService {
  private readonly notificationsSubject = new BehaviorSubject<CustomerOrderNotification[]>([]);
  private readonly toastSubject = new BehaviorSubject<CustomerOrderNotification | null>(null);
  private realtimeSubscription: Subscription | null = null;
  private currentCustomerAccountId = '';
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  public readonly notifications$ = this.notificationsSubject.asObservable();
  public readonly toast$ = this.toastSubject.asObservable();
  public readonly unreadCount$ = this.notifications$.pipe(
    map(notifications => notifications.filter(notification => !notification.read).length)
  );

  constructor(
    private readonly authService: AuthService,
    private readonly realtimeNotificationService: RealtimeNotificationService,
    private readonly audioService: CustomerNotificationAudioService
  ) {}

  public initializeForCurrentCustomer(): void {
    const customerAccountId = this.authService.getAccountId();

    if (!customerAccountId) {
      console.warn('Customer realtime notifications were not started because accountId is missing.');
      this.disconnect();
      this.notificationsSubject.next([]);
      return;
    }

    if (this.currentCustomerAccountId === customerAccountId && this.realtimeSubscription) {
      return;
    }

    this.disconnect();
    this.currentCustomerAccountId = customerAccountId;
    this.notificationsSubject.next(this.loadNotifications(customerAccountId));
    this.realtimeSubscription = this.realtimeNotificationService
      .listenToCustomerOrders(customerAccountId)
      .subscribe(event => {
        if (!event.customerAccountId || event.customerAccountId === customerAccountId) {
          this.addFromRealtimeEvent(event);
        }
      });
  }

  public markAsRead(notificationId: string): void {
    this.updateNotifications(notification =>
      notification.id === notificationId ? { ...notification, read: true } : notification
    );
  }

  public markAllAsRead(): void {
    this.updateNotifications(notification => ({ ...notification, read: true }));
  }

  public clearToast(notificationId?: string): void {
    const currentToast = this.toastSubject.value;

    if (!notificationId || currentToast?.id === notificationId) {
      this.toastSubject.next(null);
    }
  }

  private addFromRealtimeEvent(event: RealtimeOrderEventMessage): void {
    if (!this.shouldCreateNotification(event)) {
      return;
    }

    const status = this.getEventStatus(event);

    if (!status) {
      return;
    }

    const notification = this.createNotification(event, status);
    const currentNotifications = this.notificationsSubject.value;

    if (currentNotifications.some(existingNotification => existingNotification.id === notification.id)) {
      return;
    }

    const nextNotifications = [notification, ...currentNotifications].slice(0, 50);
    this.notificationsSubject.next(nextNotifications);
    this.saveNotifications(nextNotifications);
    this.showToast(notification);
    void this.audioService.playBeep().catch(error => {
      console.warn('Notification sound was blocked by the browser:', error);
    });
  }

  private shouldCreateNotification(event: RealtimeOrderEventMessage): boolean {
    if (event.eventType !== 'order.created' && event.eventType !== 'order.status.changed') {
      return false;
    }

    return !!event.orderId && !!this.getEventStatus(event);
  }

  private getEventStatus(event: RealtimeOrderEventMessage): OrderStatus | null {
    const status = event.status ?? event.newStatus;

    return this.isSupportedStatus(status) ? status : null;
  }

  private createNotification(
    event: RealtimeOrderEventMessage,
    status: OrderStatus
  ): CustomerOrderNotification {
    const createdAt = event.occurredAt ?? new Date().toISOString();
    const estimatedMessage = status === 'Accepted' && event.estimatedReadyAt
      ? ` Listo para recoger aproximadamente a las ${this.formatTime(event.estimatedReadyAt)}.`
      : '';

    return {
      id: `${event.orderId}:${status}:${createdAt}`,
      orderId: event.orderId,
      title: `Pedido ${this.getShortOrderCode(event.orderId)}`,
      message: `${ORDER_STATUS_MESSAGES[status]}${estimatedMessage}`,
      status,
      createdAt,
      read: false,
      estimatedPreparationMinutes: event.estimatedPreparationMinutes ?? null,
      estimatedReadyAt: event.estimatedReadyAt ?? null
    };
  }

  private showToast(notification: CustomerOrderNotification): void {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastSubject.next(notification);
    this.toastTimeoutId = setTimeout(() => {
      this.clearToast(notification.id);
    }, 5000);
  }

  private updateNotifications(
    mapNotification: (notification: CustomerOrderNotification) => CustomerOrderNotification
  ): void {
    const nextNotifications = this.notificationsSubject.value.map(mapNotification);
    this.notificationsSubject.next(nextNotifications);
    this.saveNotifications(nextNotifications);
  }

  private disconnect(): void {
    this.realtimeSubscription?.unsubscribe();
    this.realtimeSubscription = null;
    this.currentCustomerAccountId = '';
  }

  private loadNotifications(customerAccountId: string): CustomerOrderNotification[] {
    try {
      const storedValue = localStorage.getItem(this.getStorageKey(customerAccountId));
      const parsedValue = storedValue ? JSON.parse(storedValue) : [];

      return Array.isArray(parsedValue)
        ? parsedValue.filter(this.isStoredNotification)
        : [];
    } catch {
      return [];
    }
  }

  private saveNotifications(notifications: CustomerOrderNotification[]): void {
    if (!this.currentCustomerAccountId) {
      return;
    }

    localStorage.setItem(
      this.getStorageKey(this.currentCustomerAccountId),
      JSON.stringify(notifications)
    );
  }

  private getStorageKey(customerAccountId: string): string {
    return `${NOTIFICATION_STORAGE_PREFIX}.${customerAccountId}`;
  }

  private isSupportedStatus(status?: string | null): status is OrderStatus {
    return !!status && Object.prototype.hasOwnProperty.call(ORDER_STATUS_MESSAGES, status);
  }

  private isStoredNotification(value: unknown): value is CustomerOrderNotification {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const notification = value as Partial<CustomerOrderNotification>;

    return typeof notification.id === 'string'
      && typeof notification.orderId === 'string'
      && typeof notification.title === 'string'
      && typeof notification.message === 'string'
      && typeof notification.status === 'string'
      && typeof notification.createdAt === 'string'
      && typeof notification.read === 'boolean';
  }

  private getShortOrderCode(orderId: string): string {
    return `#${orderId.slice(-8).toUpperCase()}`;
  }

  private formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }
}
