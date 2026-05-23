import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { OrderResponse } from '../../../../customer/models/order.models';
import { OrderApiService } from '../../../../customer/services/order-api.service';

type OrderStatus =
  | 'Created'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Delivered'
  | 'Cancelled';

type StatusFilter = OrderStatus | 'all';

interface StatusFilterOption {
  value: StatusFilter;
  label: string;
}

interface OrderAction {
  label: string;
  status: OrderStatus;
  variant: 'primary' | 'danger' | 'neutral';
}

interface ProgressStep {
  status: OrderStatus;
  label: string;
}

const STATUS_FILTERS: StatusFilterOption[] = [
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

const STATUS_ORDER: OrderStatus[] = [
  'Created',
  'Accepted',
  'Preparing',
  'Ready',
  'Delivered'
];

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
  @Input() restaurantName = '';
  @Input() branches: IBranchResponse[] = [];

  public readonly statusFilters = STATUS_FILTERS;
  public readonly progressSteps: ProgressStep[] = [
    { status: 'Created', label: 'Recibido' },
    { status: 'Accepted', label: 'Aceptado' },
    { status: 'Preparing', label: 'Preparando' },
    { status: 'Ready', label: 'Listo' },
    { status: 'Delivered', label: 'Entregado' }
  ];

  public orders: OrderResponse[] = [];
  public selectedOrder: OrderResponse | null = null;

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
    return this.orders.filter(order => {
      const matchesStatus = this.selectedStatus === 'all' || order.status === this.selectedStatus;
      const matchesBranch = this.selectedBranchId === 'all' || order.branchId === this.selectedBranchId;

      return matchesStatus && matchesBranch;
    });
  }

  public setStatusFilter(status: StatusFilter): void {
    this.selectedStatus = status;
    this.loadOrders();
  }

  public setBranchFilter(branchId: string): void {
    this.selectedBranchId = branchId;
  }

  public openOrderDetail(order: OrderResponse): void {
    this.selectedOrder = order;
    this.actionErrorMessage = '';
  }

  public closeOrderDetail(): void {
    this.selectedOrder = null;
    this.actionErrorMessage = '';
  }

  public getActions(order: OrderResponse): OrderAction[] {
    return ORDER_ACTIONS[order.status as OrderStatus] ?? [];
  }

  public updateOrderStatus(order: OrderResponse, status: OrderStatus): void {
    this.updatingOrderId = order.id;
    this.actionErrorMessage = '';

    this.orderApiService.updateOrderStatus(order.id, status)
      .pipe(
        finalize(() => {
          this.updatingOrderId = null;
        })
      )
      .subscribe({
        next: updatedOrder => {
          this.orders = this.orders.map(existingOrder =>
            existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
          );

          if (this.selectedOrder?.id === updatedOrder.id) {
            this.selectedOrder = updatedOrder;
          }
        },
        error: error => {
          console.error('Order status update failed:', error);
          this.actionErrorMessage = 'No pudimos actualizar el pedido.';
        }
      });
  }

  public isStepActive(currentStatus: string, stepStatus: string): boolean {
    if (currentStatus === 'Cancelled') {
      return stepStatus === 'Created';
    }

    const currentIndex = STATUS_ORDER.indexOf(currentStatus as OrderStatus);
    const stepIndex = STATUS_ORDER.indexOf(stepStatus as OrderStatus);

    if (currentIndex === -1 || stepIndex === -1) {
      return false;
    }

    return stepIndex <= currentIndex;
  }

  public getStatusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  public getShortOrderId(orderId: string): string {
    return orderId.slice(-8).toUpperCase();
  }

  public getRestaurantName(): string {
    return this.restaurantName || this.getRestaurantFallback(this.restaurantId);
  }

  public getBranchName(branchId: string): string {
    return this.branches.find(branch => branch.id === branchId)?.name ?? this.getBranchFallback(branchId);
  }

  public getCustomerName(customerAccountId: string): string {
    // TODO: replace customer fallback with identity-service profile lookup when endpoint is available.
    return this.getCustomerFallback(customerAccountId);
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

    this.orderApiService.getRestaurantOrders(
      this.restaurantId,
      this.selectedStatus === 'all' ? undefined : { status: this.selectedStatus }
    )
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: orders => {
          this.orders = [...orders].sort(
            (first, second) =>
              new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
          );
        },
        error: error => {
          console.error('Restaurant orders load failed:', error);
          this.errorMessage = 'No pudimos cargar los pedidos del restaurante.';
          this.orders = [];
        }
      });
  }

  private getRestaurantFallback(restaurantId: string): string {
    return `Restaurante #${this.getShortId(restaurantId, 6)}`;
  }

  private getBranchFallback(branchId: string): string {
    return `Sucursal #${this.getShortId(branchId, 4)}`;
  }

  private getCustomerFallback(customerAccountId: string): string {
    return `Cliente #${this.getShortId(customerAccountId, 5)}`;
  }

  private getShortId(value: string, length: number): string {
    return (value || '------').slice(-length).toUpperCase();
  }
}
