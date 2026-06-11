import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, Subscription } from 'rxjs';

import { RealtimeNotificationService } from '../../../../services/realtime-notification.service';
import { CustomerNotificationBellComponent } from '../../components/customer-notification-bell/customer-notification-bell.component';
import { CustomerBranchResponse } from '../../models/customer-catalog.models';
import { OrderResponse } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';
import { PickupQrService } from '../../services/pickup-qr.service';

const ORDER_STATUS_LABELS: Record<string, string> = {
  Created: 'Recibido',
  Accepted: 'Aceptado',
  Preparing: 'Preparando',
  Ready: 'Listo',
  Delivered: 'Entregado',
  Cancelled: 'Cancelado'
};

const ORDER_PROGRESS = [
  { status: 'Created', label: 'Recibido' },
  { status: 'Accepted', label: 'Aceptado' },
  { status: 'Preparing', label: 'Preparando' },
  { status: 'Ready', label: 'Listo' },
  { status: 'Delivered', label: 'Entregado' }
];

@Component({
  selector: 'app-customer-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerNotificationBellComponent],
  templateUrl: './customer-order-detail.component.html',
  styleUrl: './customer-order-detail.component.css'
})
export class CustomerOrderDetailComponent implements OnInit, OnDestroy {
  public readonly progressSteps = ORDER_PROGRESS;

  public order: OrderResponse | null = null;
  public payment: PaymentResponse | null = null;
  public isLoading = true;
  public errorMessage = '';
  public pickupQrDataUrl = '';
  public pickupQrError = false;
  public restaurantName = '';
  public branchName = '';
  private currentOrderId = '';
  private realtimeCustomerAccountId = '';
  private realtimeOrdersSubscription: Subscription | null = null;
  private realtimePaymentsSubscription: Subscription | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orderApiService: OrderApiService,
    private readonly paymentApiService: PaymentApiService,
    private readonly pickupQrService: PickupQrService,
    private readonly customerCatalogApiService: CustomerCatalogApiService,
    private readonly realtimeNotificationService: RealtimeNotificationService
  ) {}

  public ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');

    if (!orderId) {
      this.errorMessage = 'No encontramos el pedido.';
      this.isLoading = false;
      return;
    }

    this.currentOrderId = orderId;
    this.loadOrderDetail(orderId);
  }

  public ngOnDestroy(): void {
    this.realtimeOrdersSubscription?.unsubscribe();
    this.realtimePaymentsSubscription?.unsubscribe();
  }

  private loadOrderDetail(orderId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      order: this.orderApiService.getOrderById(orderId),
      payment: this.paymentApiService.getPaymentByOrderId(orderId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: response => {
        this.order = response.order;
        this.payment = response.payment;
        this.isLoading = false;
        void this.generatePickupQr(response.order);
        this.resolveCatalogNames(response.order);
        this.subscribeToRealtimeUpdates(response.order);
      },
      error: () => {
        this.errorMessage = 'No pudimos cargar el detalle del pedido.';
        this.isLoading = false;
      }
    });
  }

  private subscribeToRealtimeUpdates(order: OrderResponse): void {
    if (!order.customerAccountId || order.customerAccountId === this.realtimeCustomerAccountId) {
      return;
    }

    this.realtimeOrdersSubscription?.unsubscribe();
    this.realtimePaymentsSubscription?.unsubscribe();
    this.realtimeCustomerAccountId = order.customerAccountId;
    this.realtimeOrdersSubscription = this.realtimeNotificationService
      .listenToCustomerOrders(order.customerAccountId)
      .subscribe(event => {
        if (event.orderId === this.currentOrderId) {
          this.loadOrderDetail(this.currentOrderId);
        }
      });
    this.realtimePaymentsSubscription = this.realtimeNotificationService
      .listenToCustomerPayments(order.customerAccountId)
      .subscribe(event => {
        if (event.orderId === this.currentOrderId) {
          this.loadOrderDetail(this.currentOrderId);
        }
      });
  }

  public get shortOrderId(): string {
    return this.order?.id.slice(-8).toUpperCase() ?? '';
  }

  public get orderStatusLabel(): string {
    return this.order ? ORDER_STATUS_LABELS[this.order.status] ?? this.order.status : '';
  }

  public get paymentStatusLabel(): string {
    return this.payment?.status ?? 'Pago no disponible';
  }

  public isStepActive(status: string): boolean {
    if (!this.order || this.order.status === 'Cancelled') {
      return false;
    }

    const currentIndex = this.progressSteps.findIndex(step => step.status === this.order?.status);
    const stepIndex = this.progressSteps.findIndex(step => step.status === status);

    return currentIndex >= stepIndex && stepIndex >= 0;
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

  public getEstimatedReadyLabel(): string {
    if (!this.order?.estimatedReadyAt) {
      return '';
    }

    const readyTime = new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(this.order.estimatedReadyAt));

    return `Listo para recoger aproximadamente a las ${readyTime}.`;
  }

  public isKnownCashPayment(order: OrderResponse): boolean {
    return order.paymentMethod === 'Cash'
      && order.cashPaymentType === 'KnownAmount'
      && order.cashAmountProvided !== null
      && order.cashAmountProvided !== undefined
      && order.estimatedChange !== null
      && order.estimatedChange !== undefined;
  }

  public isUnknownCashPayment(order: OrderResponse): boolean {
    return order.paymentMethod === 'Cash' && order.cashPaymentType === 'UnknownAmount';
  }

  private async generatePickupQr(order: OrderResponse): Promise<void> {
    try {
      this.pickupQrDataUrl = await this.pickupQrService.generatePickupQrDataUrl(order);
      this.pickupQrError = false;
    } catch (error) {
      console.error('Pickup QR generation failed:', error);
      this.pickupQrDataUrl = '';
      this.pickupQrError = true;
    }
  }

  private resolveCatalogNames(order: OrderResponse): void {
    forkJoin({
      restaurant: this.customerCatalogApiService.getRestaurant(order.restaurantId).pipe(catchError(() => of(null))),
      branches: this.customerCatalogApiService.getBranches(order.restaurantId)
        .pipe(catchError(() => of([] as CustomerBranchResponse[])))
    }).subscribe(result => {
      this.restaurantName = result.restaurant?.name ?? '';
      this.branchName = result.branches.find(branch => branch.id === order.branchId)?.name ?? '';
    });
  }

  getShortOrderCode(orderId?: string | null): string {
  if (!orderId) return '#------';
  return `#${orderId.slice(-8).toUpperCase()}`;
}

getStatusLabel(status?: string | null): string {
  switch (status) {
    case 'Created': return 'Recibido';
    case 'Accepted': return 'Aceptado';
    case 'Preparing': return 'Preparando';
    case 'Ready': return 'Listo';
    case 'Delivered': return 'Entregado';
    case 'Cancelled': return 'Cancelado';
    default: return 'Pedido';
  }
}

getPaymentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'Approved': return 'Pago confirmado';
    case 'Pending': return 'Pendiente';
    case 'Rejected': return 'Rechazado';
    case 'Cancelled': return 'Cancelado';
    default: return 'Sin información';
  }
}

formatRestaurantLabel(id?: string | null): string {
  if (!id) return 'No disponible';
  return this.restaurantName || `Restaurante #${id.slice(-6).toUpperCase()}`;
}

formatBranchLabel(id?: string | null): string {
  if (!id) return 'Sin sucursal';
  return this.branchName || `Sucursal #${id.slice(-4).toUpperCase()}`;
}
}
