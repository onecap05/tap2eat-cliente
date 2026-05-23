import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { OrderResponse, OrderStatus } from '../../../../customer/models/order.models';
import { OrderApiService } from '../../../../customer/services/order-api.service';

type StatusFilter = OrderStatus | 'all';

interface OrderAction {
  label: string;
  status: OrderStatus;
  variant: 'primary' | 'danger' | 'neutral';
}

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'Created', label: 'Recibidos' },
  { value: 'Accepted', label: 'Aceptados' },
  { value: 'Preparing', label: 'Preparando' },
  { value: 'Ready', label: 'Listos' },
  { value: 'Delivered', label: 'Entregados' },
  { value: 'Cancelled', label: 'Cancelados' }
];

const STATUS_LABELS: Record<string, string> = {
  Created: 'Recibido',
  Accepted: 'Aceptado',
  Preparing: 'Preparando',
  Ready: 'Listo',
  Delivered: 'Entregado',
  Cancelled: 'Cancelado'
};

const ORDER_ACTIONS: Partial<Record<OrderStatus, OrderAction[]>> = {
  Created: [
    { label: 'Aceptar', status: 'Accepted', variant: 'primary' },
    { label: 'Cancelar', status: 'Cancelled', variant: 'danger' }
  ],
  Accepted: [
    { label: 'Preparar', status: 'Preparing', variant: 'primary' },
    { label: 'Cancelar', status: 'Cancelled', variant: 'danger' }
  ],
  Preparing: [
    { label: 'Marcar listo', status: 'Ready', variant: 'primary' },
    { label: 'Cancelar', status: 'Cancelled', variant: 'danger' }
  ],
  Ready: [
    { label: 'Entregar', status: 'Delivered', variant: 'neutral' }
  ]
};

@Component({
  selector: 'app-orders-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-preview.component.html',
  styleUrl: './orders-preview.component.css'
})
export class OrdersPreviewComponent implements OnChanges {
  @Input({ required: true }) restaurantId = '';
  @Input() branches: IBranchResponse[] = [];

  public readonly statusFilters = STATUS_FILTERS;

  public orders: OrderResponse[] = [];
  public selectedStatus: StatusFilter = 'all';
  public selectedBranchId = 'all';
  public isLoading = false;
  public errorMessage = '';
  public actionErrorMessage = '';
  public updatingOrderId: string | null = null;

  constructor(private readonly orderApiService: OrderApiService) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['restaurantId'] && this.restaurantId) {
      this.loadOrders();
    }
  }

  public get filteredOrders(): OrderResponse[] {
    if (this.selectedBranchId === 'all') {
      return this.orders;
    }

    return this.orders.filter(order => order.branchId === this.selectedBranchId);
  }

  public setStatusFilter(status: StatusFilter): void {
    this.selectedStatus = status;
    this.loadOrders();
  }

  public setBranchFilter(branchId: string): void {
    this.selectedBranchId = branchId;
  }

  public getActions(order: OrderResponse): OrderAction[] {
    return ORDER_ACTIONS[order.status as OrderStatus] ?? [];
  }

  public updateOrderStatus(order: OrderResponse, status: OrderStatus): void {
    this.updatingOrderId = order.id;
    this.actionErrorMessage = '';

    this.orderApiService.updateOrderStatus(order.id, status)
      .pipe(finalize(() => {
        this.updatingOrderId = null;
      }))
      .subscribe({
        next: updatedOrder => {
          this.orders = this.orders.map(existingOrder =>
            existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
          );
        },
        error: () => {
          this.actionErrorMessage = 'No pudimos actualizar el pedido.';
        }
      });
  }

  public getStatusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  public getShortOrderId(orderId: string): string {
    return orderId.slice(-8).toUpperCase();
  }

  public getBranchName(branchId: string): string {
    return this.branches.find(branch => branch.id === branchId)?.name ?? branchId;
  }

  public getItemSummary(order: OrderResponse): string {
    return order.items
      .map(item => `${item.quantity}x ${item.productNameSnapshot}`)
      .join(', ');
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
    if (!this.restaurantId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.actionErrorMessage = '';

    const filters = this.selectedStatus === 'all' ? {} : { status: this.selectedStatus };

    this.orderApiService.getRestaurantOrders(this.restaurantId, filters)
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: orders => {
          this.orders = orders;
        },
        error: () => {
          this.errorMessage = 'No pudimos cargar los pedidos del restaurante.';
          this.orders = [];
        }
      });
  }
}
