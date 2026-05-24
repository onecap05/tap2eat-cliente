import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { loadScript } from '@paypal/paypal-js';

import { environment } from '../../../../../environments/environment';
import { PayPalCaptureResponse } from '../../models/paypal-payment.models';
import { PaymentApiService } from '../../services/payment-api.service';

const PAYPAL_TEXT = {
  missingConfig: 'PayPal Sandbox no esta configurado. Agrega el Client ID para continuar.',
  loading: 'Cargando PayPal...',
  ready: 'Completa el pago con PayPal Sandbox.',
  cancelled: 'Pago cancelado. Puedes intentarlo de nuevo.',
  failed: 'No pudimos completar el pago con PayPal. Intenta de nuevo.'
};

@Component({
  selector: 'app-paypal-checkout-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paypal-checkout-button.component.html',
  styleUrl: './paypal-checkout-button.component.css'
})
export class PayPalCheckoutButtonComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() public paymentId = '';
  @Input() public orderId = '';
  @Output() public paymentCaptured = new EventEmitter<PayPalCaptureResponse>();
  @Output() public paymentFailed = new EventEmitter<string>();
  @ViewChild('paypalContainer') private readonly paypalContainer?: ElementRef<HTMLDivElement>;

  public readonly text = PAYPAL_TEXT;
  public isLoading = false;
  public message = '';
  public errorMessage = '';

  private hasRendered = false;

  constructor(private readonly paymentApiService: PaymentApiService) {}

  public ngOnInit(): void {
    if (!environment.paypalClientId.trim()) {
      this.message = this.text.missingConfig;
    }
  }

  public ngAfterViewInit(): void {
    void this.renderPayPalButton();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ((changes['paymentId'] || changes['orderId']) && this.paypalContainer) {
      this.hasRendered = false;
      this.paypalContainer.nativeElement.replaceChildren();
      void this.renderPayPalButton();
    }
  }

  public async createPayPalOrder(): Promise<string> {
    const response = await firstValueFrom(this.paymentApiService.createPayPalOrder(this.paymentId));
    return response.paypalOrderId;
  }

  public async handlePayPalApproved(paypalOrderId: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.paymentApiService.capturePayPalOrder(this.paymentId, paypalOrderId)
      );

      if (response.paymentStatus === 'Approved' || response.paymentStatus === 'APPROVED') {
        this.errorMessage = '';
        this.paymentCaptured.emit(response);
        return;
      }

      this.fail(this.text.failed);
    } catch (error) {
      console.error('PayPal capture failed:', error);
      this.fail(this.text.failed);
    }
  }

  public handlePayPalCancelled(): void {
    this.fail(this.text.cancelled);
  }

  public handlePayPalError(error: unknown): void {
    console.error('PayPal checkout failed:', error);
    this.fail(this.text.failed);
  }

  private async renderPayPalButton(): Promise<void> {
    if (this.hasRendered || !this.paypalContainer) {
      return;
    }

    if (!environment.paypalClientId.trim()) {
      return;
    }

    if (!this.paymentId) {
      return;
    }

    try {
      this.isLoading = true;
      this.message = this.text.loading;
      const paypal = await loadScript({
        clientId: environment.paypalClientId,
        currency: 'MXN',
        intent: 'capture'
      });

      const buttons = paypal?.Buttons?.({
        createOrder: () => this.createPayPalOrder(),
        onApprove: data => this.handlePayPalApproved(data.orderID),
        onCancel: () => this.handlePayPalCancelled(),
        onError: error => this.handlePayPalError(error)
      });

      if (!buttons) {
        this.fail(this.text.failed);
        return;
      }

      await buttons.render(this.paypalContainer.nativeElement);
      this.hasRendered = true;
      this.message = this.text.ready;
      this.errorMessage = '';
    } catch (error) {
      this.handlePayPalError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private fail(message: string): void {
    this.errorMessage = message;
    this.paymentFailed.emit(message);
  }
}
