import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-order-detail.component.html',
  styleUrl: './customer-order-detail.component.css'
})
export class CustomerOrderDetailComponent implements OnInit {
  public readonly progressSteps = ORDER_PROGRESS;

  public order: OrderResponse | null = null;
  public payment: PaymentResponse | null = null;
  public isLoading = true;
  public errorMessage = '';
  public pickupQrDataUrl = '';
  public pickupQrError = false;
  public restaurantName = '';
  public branchName = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orderApiService: OrderApiService,
    private readonly paymentApiService: PaymentApiService,
    private readonly pickupQrService: PickupQrService,
    private readonly customerCatalogApiService: CustomerCatalogApiService
  ) {}

  public ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');

    if (!orderId) {
      this.errorMessage = 'No encontramos el pedido.';
      this.isLoading = false;
      return;
    }

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
      },
      error: () => {
        this.errorMessage = 'No pudimos cargar el detalle del pedido.';
        this.isLoading = false;
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
