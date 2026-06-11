import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map, retry, Subscription, switchMap } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { CustomerNotificationBellComponent } from '../../components/customer-notification-bell/customer-notification-bell.component';
import { PayPalCheckoutButtonComponent } from '../../components/paypal-checkout-button/paypal-checkout-button.component';
import { ICartItem, ICartState } from '../../models/cart.models';
import { CreateOrderRequest } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { CartService } from '../../services/cart.service';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';

type PaymentMethod = 'online' | 'cash';
type CashPaymentSelection = 'known' | 'unknown';

const CHECKOUT_TEXT = {
  title: 'Checkout',
  subtitle: 'Revisa tu carrito y confirma tu pedido.',
  emptyTitle: 'Tu carrito esta vacio',
  emptyBody: 'Explora restaurantes y agrega productos para continuar.',
  backToRestaurants: 'Volver a restaurantes',
  paymentMethod: 'Metodo de pago',
  online: 'Pago online',
  paypalReady: 'Orden creada. Completa el pago con PayPal Sandbox para confirmar tu pedido.',
  cash: 'Pago en efectivo',
  cashKnownAmount: 'Pagare con una cantidad especifica',
  cashUnknownAmount: 'No se con cuanto voy a pagar',
  cashAmountLabel: 'Monto con el que pagaras',
  estimatedChange: 'Cambio estimado',
  missingCashAmount: 'Ingresa el monto con el que pagaras.',
  invalidCashAmount: 'El monto en efectivo debe ser mayor o igual al total del pedido.',
  notesPlaceholder: 'Ej. Sin mayonesa, entregar todo junto...',
  service: 'Servicio',
  total: 'Total',
  submit: 'Proceder al pago',
  processing: 'Procesando...',
  missingSession: 'Inicia sesion para continuar.',
  missingRestaurant: 'El carrito no tiene restaurante asociado.',
  missingBranch: 'Selecciona una sucursal antes de continuar.',
  invalidItems: 'Revisa los productos del carrito antes de continuar.',
  invalidModifierOptions: 'Algunas opciones del producto no tienen un identificador valido. Vuelve a seleccionar el producto.',
  genericError: 'No pudimos completar el checkout. Intenta de nuevo.',
  paymentPendingError: 'El pedido fue creado, pero no pudimos confirmar el pago. Consulta tus pedidos.'
};

const PAYMENT_LOOKUP_RETRY_COUNT = 8;
const PAYMENT_LOOKUP_RETRY_DELAY_MS = 700;

@Component({
  selector: 'app-customer-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PayPalCheckoutButtonComponent, CustomerNotificationBellComponent],
  templateUrl: './customer-checkout.component.html',
  styleUrl: './customer-checkout.component.css'
})
export class CustomerCheckoutComponent implements OnInit, OnDestroy {
  public readonly text = CHECKOUT_TEXT;
  public cartState: ICartState;
  public paymentMethod: PaymentMethod = 'online';
  public cashPaymentType: CashPaymentSelection = 'known';
  public cashAmountProvided: number | null = null;
  public notes = '';
  public isSubmitting = false;
  public errorMessage = '';
  public pendingOrderId: string | null = null;
  public pendingPaymentId: string | null = null;

  private cartSubscription?: Subscription;

  constructor(
    private readonly cartService: CartService,
    private readonly orderApiService: OrderApiService,
    private readonly paymentApiService: PaymentApiService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.cartState = this.cartService.getSnapshot();
  }

  public ngOnInit(): void {
    this.cartSubscription = this.cartService.state$.subscribe(state => {
      this.cartState = state;
    });
  }

  public ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
  }

  public get serviceFee(): number {
    return 0;
  }

  public get total(): number {
    return this.cartState.subtotal + this.serviceFee;
  }

  public get estimatedChange(): number | null {
    const cashAmount = this.getCashAmountProvided();

    if (this.paymentMethod !== 'cash' || this.cashPaymentType !== 'known' || cashAmount === null) {
      return null;
    }

    return this.roundCurrency(cashAmount - this.total);
  }

  public get cashAmountError(): string {
    if (this.paymentMethod !== 'cash' || this.cashPaymentType !== 'known') {
      return '';
    }

    const cashAmount = this.getCashAmountProvided();

    if (cashAmount === null) {
      return '';
    }

    return cashAmount < this.total ? this.text.invalidCashAmount : '';
  }

  public get canSubmitCheckout(): boolean {
    if (this.isSubmitting) {
      return false;
    }

    return this.paymentMethod !== 'cash'
      || this.cashPaymentType !== 'known'
      || this.isKnownCashAmountValid();
  }

  public get submitLabel(): string {
    if (this.isSubmitting) {
      return this.text.processing;
    }

    return this.paymentMethod === 'cash' ? 'Crear pedido' : this.text.submit;
  }

  public increaseItem(item: ICartItem): void {
    this.cartService.increaseItem(item.id);
  }

  public decreaseItem(item: ICartItem): void {
    this.cartService.decreaseItem(item.id);
  }

  public removeItem(item: ICartItem): void {
    this.cartService.removeItem(item.id);
  }

  public submitCheckout(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    const request = this.buildOrderRequest();

    if (!request) {
      return;
    }

    this.isSubmitting = true;
    this.pendingOrderId = null;
    this.pendingPaymentId = null;
    let orderWasCreated = false;

    if (this.paymentMethod === 'cash') {
      this.orderApiService.createOrder(request).subscribe({
        next: order => {
          orderWasCreated = true;
          this.cartService.clear();
          void this.router.navigate(
            ['/customer/orders', order.id, 'confirmation'],
            { replaceUrl: true }
          );
        },
        error: error => this.handleSubmitError(error, orderWasCreated),
        complete: () => {
          this.isSubmitting = false;
        }
      });
      return;
    }

    this.orderApiService.createOrder(request).pipe(
      switchMap(order => {
        orderWasCreated = true;

        return this.paymentApiService.getPaymentByOrderId(order.id).pipe(
          retry({
            count: PAYMENT_LOOKUP_RETRY_COUNT,
            delay: PAYMENT_LOOKUP_RETRY_DELAY_MS
          }),
          map(payment => ({ orderId: order.id, payment }))
        );
      })
    ).subscribe({
      next: ({ orderId, payment }) => {
        this.isSubmitting = false;
        this.preparePayPalPayment(orderId, payment);
      },
      error: error => this.handleSubmitError(error, orderWasCreated)
    });
  }

  public handlePayPalCaptured(): void {
    if (!this.pendingOrderId) {
      return;
    }

    const orderId = this.pendingOrderId;
    this.cartService.clear();
    void this.router.navigate(
      ['/customer/payment-success', orderId],
      { replaceUrl: true }
    );
  }

  public handlePayPalFailed(message: string): void {
    this.errorMessage = message;
    this.isSubmitting = false;
  }

  private preparePayPalPayment(orderId: string, payment: PaymentResponse): void {
    if (payment.status === 'Approved') {
      this.pendingOrderId = orderId;
      this.pendingPaymentId = payment.id;
      this.handlePayPalCaptured();
      return;
    }

    if (payment.status !== 'Pending') {
      this.errorMessage = this.text.paymentPendingError;
      return;
    }

    this.pendingOrderId = orderId;
    this.pendingPaymentId = payment.id;
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  private buildOrderRequest(): CreateOrderRequest | null {
    const customerAccountId = this.authService.getAccountId();

    if (!customerAccountId) {
      this.errorMessage = this.text.missingSession;
      return null;
    }

    if (!this.cartState.restaurantId) {
      this.errorMessage = this.text.missingRestaurant;
      return null;
    }

    if (!this.cartState.branchId) {
      this.errorMessage = this.text.missingBranch;
      return null;
    }

    if (!this.cartState.items.length || this.cartState.items.some(item => !item.productId || item.quantity <= 0)) {
      this.errorMessage = this.text.invalidItems;
      return null;
    }

    if (this.cartState.items.some(item => this.hasInvalidModifierOptionIds(item))) {
      this.errorMessage = this.text.invalidModifierOptions;
      return null;
    }

    const paymentPayload = this.buildPaymentPayload();

    if (!paymentPayload) {
      return null;
    }

    return {
      customerAccountId,
      restaurantId: this.cartState.restaurantId,
      branchId: this.cartState.branchId,
      notes: this.notes.trim() || undefined,
      ...paymentPayload,
      items: this.cartState.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedModifierOptionIds: item.selectedModifiers.map(modifier => modifier.optionId)
      }))
    };
  }

  private buildPaymentPayload(): Pick<
    CreateOrderRequest,
    'paymentMethod' | 'cashPaymentType' | 'cashAmountProvided' | 'estimatedChange'
  > | null {
    if (this.paymentMethod === 'online') {
      return {
        paymentMethod: 'Online',
        cashPaymentType: null,
        cashAmountProvided: null,
        estimatedChange: null
      };
    }

    if (this.cashPaymentType === 'unknown') {
      return {
        paymentMethod: 'Cash',
        cashPaymentType: 'UnknownAmount',
        cashAmountProvided: null,
        estimatedChange: null
      };
    }

    const cashAmount = this.getCashAmountProvided();

    if (cashAmount === null) {
      this.errorMessage = this.text.missingCashAmount;
      return null;
    }

    if (cashAmount < this.total) {
      this.errorMessage = this.text.invalidCashAmount;
      return null;
    }

    return {
      paymentMethod: 'Cash',
      cashPaymentType: 'KnownAmount',
      cashAmountProvided: cashAmount,
      estimatedChange: this.roundCurrency(cashAmount - this.total)
    };
  }

  private getCashAmountProvided(): number | null {
    const rawValue = this.cashAmountProvided as number | string | null | undefined;

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    return this.roundCurrency(value);
  }

  private isKnownCashAmountValid(): boolean {
    const cashAmount = this.getCashAmountProvided();

    return cashAmount !== null && cashAmount >= this.total;
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private hasInvalidModifierOptionIds(item: ICartItem): boolean {
    return item.selectedModifiers.some(modifier => {
      const optionId = modifier.optionId?.trim();
      const optionName = modifier.optionName?.trim();

      return !optionId || (!!optionName && optionId === optionName);
    });
  }

  private handleSubmitError(error: unknown, orderWasCreated = false): void {
    console.error('Checkout failed:', error);
    this.isSubmitting = false;
    this.errorMessage = orderWasCreated ? this.text.paymentPendingError : this.text.genericError;
  }
}
