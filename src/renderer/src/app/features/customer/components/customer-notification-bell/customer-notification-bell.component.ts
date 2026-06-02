import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CustomerOrderNotification } from '../../models/customer-notification.models';
import { CustomerNotificationService } from '../../services/customer-notification.service';

@Component({
  selector: 'app-customer-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-notification-bell.component.html',
  styleUrl: './customer-notification-bell.component.css'
})
export class CustomerNotificationBellComponent implements OnInit {
  public isOpen = false;

  constructor(public readonly notificationService: CustomerNotificationService) {}

  public ngOnInit(): void {
    this.notificationService.initializeForCurrentCustomer();
  }

  public togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  public closePanel(): void {
    this.isOpen = false;
  }

  public markAsRead(notification: CustomerOrderNotification, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.notificationService.markAsRead(notification.id);
  }

  public markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  public dismissToast(notificationId: string): void {
    this.notificationService.clearToast(notificationId);
  }

  public formatNotificationDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }

  public trackByNotificationId(_index: number, notification: CustomerOrderNotification): string {
    return notification.id;
  }
}
