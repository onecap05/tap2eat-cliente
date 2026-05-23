import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { OrderQueryFilters, OrderResponse, OrderStatus } from '../../models/order.models';
import { OrderApiService } from '../../services/order-api.service';

const ORDER_STATUS_OPTIONS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'Created', label: 'Recibidos' },
  { value: 'Accepted', label: 'Aceptados' },
  { value: 'Preparing', label: 'Preparando' },
  { value: 'Ready', label: 'Listos' },
  { value: 'Delivered', label: 'Entregados' },
  { value: 'Cancelled', label: 'Cancelados' }
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  Created: 'Recibido',
  Accepted: 'Aceptado',
  Preparing: 'Preparando',
  Ready: 'Listo',
  Delivered: 'Entregado',
  Cancelled: 'Cancelado'
};

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-orders.component.html',
  styleUrl: './customer-orders.component.css'
})
export class CustomerOrdersComponent implements OnInit {
  public readonly statusOptions = ORDER_STATUS_OPTIONS;

  public orders: OrderResponse[] = [];
  public selectedStatus: OrderStatus | 'all' = 'all';
  public isLoading = false;
  public errorMessage = '';
  public authMessage = '';

  private customerAccountId: string | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly orderApiService: OrderApiService
  ) {}

  public ngOnInit(): void {
    this.customerAccountId = this.authService.getAccountId();

    if (!this.customerAccountId) {
      this.authMessage = 'Inicia sesion para consultar tus pedidos.';
      return;
    }

    this.loadOrders();
  }

  public setStatusFilter(status: OrderStatus | 'all'): void {
    this.selectedStatus = status;
    this.loadOrders();
  }

  public getStatusLabel(status: string): string {
    return ORDER_STATUS_LABELS[status] ?? status;
  }

  public getShortOrderId(orderId: string): string {
    return orderId.slice(-8).toUpperCase();
  }

  public getItemCount(order: OrderResponse): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  public formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private loadOrders(): void {
    if (!this.customerAccountId) {
      return;
    }

    const filters: OrderQueryFilters = this.selectedStatus === 'all'
      ? {}
      : { status: this.selectedStatus };

    this.isLoading = true;
    this.errorMessage = '';

    this.orderApiService.getCustomerOrders(this.customerAccountId, filters)
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: orders => {
          this.orders = orders;
        },
        error: () => {
          this.errorMessage = 'No pudimos cargar tus pedidos.';
          this.orders = [];
        }
      });
  }
}
