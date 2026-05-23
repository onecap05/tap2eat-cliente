import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { OrderResponse } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';
import { PickupQrService } from '../../services/pickup-qr.service';

const STATUS_LABELS: Record<string, string> = {
  Created: 'Recibido',
  Accepted: 'Recibido',
  Preparing: 'Preparando',
  Ready: 'Listo',
  Delivered: 'Entregado',
  Cancelled: 'Cancelado'
};

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
      payment: this.paymentApiService.getPaymentByOrderId(orderId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: response => {
        this.order = response.order;
        this.payment = response.payment;
        this.isLoading = false;
        void this.generatePickupQr(response.order);
      },
      error: () => {
        this.errorMessage = 'No pudimos cargar la confirmacion del pedido.';
        this.isLoading = false;
      }
    });
  }

  public get shortOrderNumber(): string {
    return this.order?.id.slice(-8).toUpperCase() ?? '';
  }

  public get statusLabel(): string {
    return this.order ? STATUS_LABELS[this.order.status] ?? this.order.status : '';
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
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
