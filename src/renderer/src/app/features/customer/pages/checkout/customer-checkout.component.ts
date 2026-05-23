import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, of, retry, switchMap } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { ICartItem, ICartState } from '../../models/cart.models';
import { CreateOrderRequest } from '../../models/order.models';
import { PaymentResponse } from '../../models/payment.models';
import { CartService } from '../../services/cart.service';
import { OrderApiService } from '../../services/order-api.service';
import { PaymentApiService } from '../../services/payment-api.service';

type PaymentMethod = 'online' | 'cash';

const CHECKOUT_TEXT = {
  title: 'Checkout',
  subtitle: 'Revisa tu carrito y confirma tu pedido.',
  emptyTitle: 'Tu carrito esta vacio',
  emptyBody: 'Explora restaurantes y agrega productos para continuar.',
  backToRestaurants: 'Volver a restaurantes',
  paymentMethod: 'Metodo de pago',
  online: 'Pago online',
  cash: 'Pago en efectivo',
  notesPlaceholder: 'Ej. Sin mayonesa, entregar todo junto...',
  service: 'Servicio',
  total: 'Total',
  submit: 'Proceder al pago',
  processing: 'Procesando...',
  missingSession: 'Inicia sesion para continuar.',
  missingRestaurant: 'El carrito no tiene restaurante asociado.',
  missingBranch: 'Selecciona una sucursal antes de continuar.',
  invalidItems: 'Revisa los productos del carrito antes de continuar.',
  genericError: 'No pudimos completar el checkout. Intenta de nuevo.',
  paymentPendingError: 'El pedido fue creado, pero no pudimos confirmar el pago. Consulta tus pedidos.'
};

const PAYMENT_LOOKUP_RETRY_COUNT = 8;
const PAYMENT_LOOKUP_RETRY_DELAY_MS = 700;

@Component({
  selector: 'app-customer-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-checkout.component.html',
  styleUrl: './customer-checkout.component.css'
})
export class CustomerCheckoutComponent implements OnInit, OnDestroy {
  public readonly text = CHECKOUT_TEXT;
  public cartState: ICartState;
  public paymentMethod: PaymentMethod = 'online';
  public notes = '';
  public isSubmitting = false;
  public errorMessage = '';

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
        this.cartService.clear();

        return this.paymentApiService.getPaymentByOrderId(order.id).pipe(
          retry({
            count: PAYMENT_LOOKUP_RETRY_COUNT,
            delay: PAYMENT_LOOKUP_RETRY_DELAY_MS
          }),
          switchMap(payment => this.approvePendingPayment(payment, order.id)),
          switchMap(() => this.router.navigate(
            ['/customer/payment-success', order.id],
            { replaceUrl: true }
          ))
        );
      })
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
      },
      error: error => this.handleSubmitError(error, orderWasCreated)
    });
  }

  private approvePendingPayment(payment: PaymentResponse, orderId: string) {
    if (payment.status === 'Approved') {
      return of(payment);
    }

    if (payment.status !== 'Pending') {
      return of(payment);
    }

    return this.paymentApiService.approvePayment(
      payment.id,
      { providerReference: `WEB-${orderId.slice(-8)}` }
    );
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

    return {
      customerAccountId,
      restaurantId: this.cartState.restaurantId,
      branchId: this.cartState.branchId,
      notes: this.notes.trim() || undefined,
      items: this.cartState.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedModifierOptionIds: item.selectedModifiers.map(modifier => modifier.optionId)
      }))
    };
  }

  private handleSubmitError(error: unknown, orderWasCreated = false): void {
    console.error('Checkout failed:', error);
    this.isSubmitting = false;
    this.errorMessage = orderWasCreated ? this.text.paymentPendingError : this.text.genericError;
  }
}
