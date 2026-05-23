import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { OrderResponse } from '../../models/order.models';
import { OrderApiService } from '../../services/order-api.service';

type CustomerOrderTab = 'active' | 'delivered';

const ORDER_TABS: Array<{ value: CustomerOrderTab; label: string }> = [
  { value: 'active', label: 'No entregados' },
  { value: 'delivered', label: 'Entregados' }
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
  public readonly orderTabs = ORDER_TABS;

  public orders: OrderResponse[] = [];
  public selectedTab: CustomerOrderTab = 'active';
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

  public get visibleOrders(): OrderResponse[] {
    if (this.selectedTab === 'delivered') {
      return this.orders.filter(order => order.status === 'Delivered');
    }

    return this.orders.filter(order => order.status !== 'Delivered');
  }

  public get emptyMessage(): string {
    return this.selectedTab === 'delivered'
      ? 'Aun no tienes pedidos entregados.'
      : 'No tienes pedidos activos.';
  }

  public setOrderTab(tab: CustomerOrderTab): void {
    this.selectedTab = tab;
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

    this.isLoading = true;
    this.errorMessage = '';

    this.orderApiService.getCustomerOrders(this.customerAccountId)
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
