import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { OrderResponse } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';
import { PickupQrService } from '../../services/pickup-qr.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.css'
})
export class OrderConfirmationComponent implements OnInit {
  public order: OrderResponse | null = null;
  public payment: PaymentResponse | null = null;
  public isLoading = true;
  public errorMessage = '';
  public pickupQrDataUrl = '';
  public pickupQrError = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orderApiService: OrderApiService,
    private readonly paymentApiService: PaymentApiService,
    private readonly pickupQrService: PickupQrService
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
      payment: this.paymentApiService.getPaymentByOrderId(orderId).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: response => {
        this.order = response.order;
        this.payment = response.payment;
        this.isLoading = false;

        void this.generatePickupQr(response.order);
      },
      error: error => {
        console.error('Order confirmation load failed:', error);
        this.errorMessage = 'No pudimos cargar la confirmación del pedido.';
        this.isLoading = false;
      }
    });
  }

  // Compatibilidad con HTML anterior que usaba qrCodeDataUrl.
  public get qrCodeDataUrl(): string {
    return this.pickupQrDataUrl;
  }

  // Compatibilidad con HTML anterior que usaba qrCodeError.
  public get qrCodeError(): boolean {
    return this.pickupQrError;
  }

  public get shortOrderNumber(): string {
    return this.order?.id.slice(-8).toUpperCase() ?? '';
  }

  public get statusLabel(): string {
    return this.getOrderStatusLabel(this.order?.status);
  }

  public get paymentStatusLabel(): string {
    return this.getPaymentStatusLabel(this.payment?.status);
  }

  public getShortOrderCode(orderId?: string | null): string {
    if (!orderId) {
      return '#------';
    }

    return `#${orderId.slice(-8).toUpperCase()}`;
  }

  public getOrderStatusLabel(status?: string | null): string {
    switch (status) {
      case 'Created':
        return 'Recibido';
      case 'Accepted':
        return 'Aceptado';
      case 'Preparing':
        return 'Preparando';
      case 'Ready':
        return 'Listo';
      case 'Delivered':
        return 'Entregado';
      case 'Cancelled':
        return 'Cancelado';
      default:
        return 'Pedido confirmado';
    }
  }

  public getOrderStatusClass(status?: string | null): string {
    switch (status) {
      case 'Created':
        return 'status-created';
      case 'Accepted':
        return 'status-accepted';
      case 'Preparing':
        return 'status-preparing';
      case 'Ready':
        return 'status-ready';
      case 'Delivered':
        return 'status-delivered';
      case 'Cancelled':
        return 'status-cancelled';
      default:
        return 'status-created';
    }
  }

  public getPaymentStatusLabel(status?: string | null): string {
    switch (status) {
      case 'Approved':
        return 'Pago confirmado';
      case 'Pending':
        return 'Pendiente';
      case 'Rejected':
        return 'Rechazado';
      case 'Cancelled':
        return 'Cancelado';
      default:
        return 'Sin información';
    }
  }

  public getPaymentStatusClass(status?: string | null): string {
    switch (status) {
      case 'Approved':
        return 'payment-approved';
      case 'Pending':
        return 'payment-pending';
      case 'Rejected':
        return 'payment-rejected';
      case 'Cancelled':
        return 'payment-cancelled';
      default:
        return 'payment-pending';
    }
  }

  public getPaymentMethodLabel(): string {
    if (this.order?.paymentMethod === 'Cash') {
      return 'Pago en efectivo';
    }

    if (this.order?.paymentMethod === 'Online') {
      return 'Pago en linea';
    }

    if (!this.payment) {
      return 'No disponible';
    }

    if (this.payment.provider && this.payment.provider.trim().length > 0) {
      return 'Pago en línea';
    }

    return 'Pago en efectivo';
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

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  public formatRestaurantLabel(id?: string | null): string {
    if (!id) {
      return 'No disponible';
    }

    return `Restaurante ${id.slice(-6).toUpperCase()}`;
  }

  public formatBranchLabel(id?: string | null): string {
    if (!id) {
      return 'Sin sucursal';
    }

    return `Sucursal ${id.slice(-4).toUpperCase()}`;
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
}
