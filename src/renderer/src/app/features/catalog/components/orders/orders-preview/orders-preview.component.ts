import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { OrderResponse } from '../../../../customer/models/order.models';
import { PaymentResponse } from '../../../../customer/models/payment.models';
import { OrderApiService } from '../../../../customer/services/order-api.service';
import { PaymentApiService } from '../../../../customer/services/payment-api.service';
import { RealtimeNotificationService } from '../../../../../services/realtime-notification.service';

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

interface PreparationTimeOption {
  value: string;
  label: string;
}

interface TicketData {
  order: OrderResponse;
  payment: PaymentResponse;
  generatedAt: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  amountReceived: number;
  changeAmount: number;
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
  Ready: []
};

const CANCEL_ORDER_CONFIRMATION_MESSAGE =
  '¿Seguro que deseas cancelar este pedido? El cliente será notificado del cambio.';

const PREPARATION_TIME_OPTIONS: PreparationTimeOption[] = [
  { value: '10', label: '10 minutos' },
  { value: '15', label: '15 minutos' },
  { value: '20', label: '20 minutos' },
  { value: '30', label: '30 minutos' },
  { value: 'custom', label: 'Personalizado' }
];

@Component({
  selector: 'app-orders-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-preview.component.html',
  styleUrl: './orders-preview.component.css'
})
export class OrdersPreviewComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) restaurantId = '';
  @Input() restaurantName = '';
  @Input() restaurantRfc = '';
  @Input() branches: IBranchResponse[] = [];

  public readonly statusFilters = STATUS_FILTERS;
  public readonly progressSteps: ProgressStep[] = [
    { status: 'Created', label: 'Recibido' },
    { status: 'Accepted', label: 'Aceptado' },
    { status: 'Preparing', label: 'Preparando' },
    { status: 'Ready', label: 'Listo' },
    { status: 'Delivered', label: 'Entregado' }
  ];
  public readonly preparationTimeOptions = PREPARATION_TIME_OPTIONS;

  public orders: OrderResponse[] = [];
  public selectedOrder: OrderResponse | null = null;

  public selectedStatus: StatusFilter = 'all';
  public selectedBranchId = 'all';

  public isLoading = false;
  public errorMessage = '';
  public actionErrorMessage = '';
  public updatingOrderId: string | null = null;
  public ticketGeneratingOrderId: string | null = null;
  public selectedPreparationTimeOption = '15';
  public customPreparationMinutes = 25;
  public cashTicketOrderId = '';
  public cashPaidWithSuggested = true;
  public cashAmountReceived: number | null = null;
  public generatedTicket: TicketData | null = null;

  private realtimeOrdersSubscription?: Subscription;
  private realtimePaymentsSubscription?: Subscription;
  private readonly ticketGeneratedOrderIds = new Set<string>();

  constructor(
    private readonly orderApiService: OrderApiService,
    private readonly paymentApiService: PaymentApiService,
    private readonly realtimeNotificationService: RealtimeNotificationService
  ) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['restaurantId'] && this.restaurantId) {
      this.loadOrders();
      this.subscribeToRealtimeOrders();
    }
  }

  public ngOnDestroy(): void {
    this.realtimeOrdersSubscription?.unsubscribe();
    this.realtimePaymentsSubscription?.unsubscribe();
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
    this.resetTicketForm();
  }

  public closeOrderDetail(): void {
    this.selectedOrder = null;
    this.actionErrorMessage = '';
    this.resetTicketForm();
  }

  public getActions(order: OrderResponse): OrderAction[] {
    return ORDER_ACTIONS[order.status as OrderStatus] ?? [];
  }

  public updateOrderStatus(order: OrderResponse, status: OrderStatus): void {
    if (order.status === 'Ready' && status === 'Delivered' && !this.hasGeneratedTicket(order)) {
      this.actionErrorMessage = 'Primero genera el ticket del pedido.';
      return;
    }

    if (status === 'Cancelled' && !window.confirm(CANCEL_ORDER_CONFIRMATION_MESSAGE)) {
      return;
    }

    const estimatedPreparationMinutes = status === 'Accepted'
      ? this.getSelectedPreparationMinutes()
      : undefined;

    if (status === 'Accepted' && estimatedPreparationMinutes === null) {
      this.actionErrorMessage = 'Selecciona un tiempo estimado valido.';
      return;
    }

    this.updatingOrderId = order.id;
    this.actionErrorMessage = '';

    this.orderApiService.updateOrderStatus(order.id, status, estimatedPreparationMinutes)
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

  public getBranchAddress(branchId: string): string {
    return this.getBranch(branchId)?.formattedAddress || 'Dirección no disponible';
  }

  public getBranchPhone(branchId: string): string {
    return this.getBranch(branchId)?.phoneNumber || '';
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

  public getEstimatedReadyLabel(order: OrderResponse): string {
    if (!order.estimatedReadyAt) {
      return '';
    }

    const readyTime = new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(order.estimatedReadyAt));

    return `Listo para recoger aproximadamente a las ${readyTime}.`;
  }

  public hasGeneratedTicket(order: OrderResponse): boolean {
    return this.ticketGeneratedOrderIds.has(order.id);
  }

  public beginTicketFlow(order: OrderResponse): void {
    this.actionErrorMessage = '';
    this.generatedTicket = null;

    if (this.isCashOrder(order)) {
      this.cashTicketOrderId = order.id;
      this.cashPaidWithSuggested = !!order.cashAmountProvided;
      this.cashAmountReceived = order.cashAmountProvided ?? null;
      return;
    }

    this.generateOnlineTicket(order);
  }

  public confirmCashTicket(order: OrderResponse): void {
    const amountReceived = this.getCashAmountForTicket(order);

    if (amountReceived === null) {
      this.actionErrorMessage = 'Captura una cantidad recibida válida.';
      return;
    }

    if (amountReceived < order.total) {
      this.actionErrorMessage = 'La cantidad recibida debe ser mayor o igual al total del pedido.';
      return;
    }

    this.ticketGeneratingOrderId = order.id;
    this.actionErrorMessage = '';

    this.paymentApiService.getPaymentByOrderId(order.id).subscribe({
      next: payment => {
        this.paymentApiService.confirmCashPayment(payment.id, { amountReceived })
          .pipe(
            finalize(() => {
              this.ticketGeneratingOrderId = null;
            })
          )
          .subscribe({
            next: confirmedPayment => this.setGeneratedTicket(
              order,
              confirmedPayment,
              'Efectivo',
              'Pagado',
              confirmedPayment.amountReceived ?? amountReceived,
              confirmedPayment.changeAmount ?? this.roundCurrency(amountReceived - order.total)
            ),
            error: error => {
              console.error('Cash payment confirmation failed:', error);
              this.actionErrorMessage = 'No pudimos registrar el pago en efectivo.';
            }
          });
      },
      error: error => {
        console.error('Payment lookup failed:', error);
        this.ticketGeneratingOrderId = null;
        this.actionErrorMessage = 'No pudimos encontrar el pago del pedido.';
      }
    });
  }

  public getCashChangeForTicket(order: OrderResponse): number | null {
    const amountReceived = this.getCashAmountForTicket(order);

    if (amountReceived === null) {
      return null;
    }

    return this.roundCurrency(amountReceived - order.total);
  }

  public shouldAskCashSuggestion(order: OrderResponse): boolean {
    return order.cashPaymentType === 'KnownAmount'
      && order.cashAmountProvided !== null
      && order.cashAmountProvided !== undefined;
  }

  public shouldShowCashAmountInput(order: OrderResponse): boolean {
    return !this.shouldAskCashSuggestion(order) || !this.cashPaidWithSuggested;
  }

  public printTicket(): void {
    if (!this.generatedTicket) {
      this.actionErrorMessage = 'Primero genera el ticket del pedido.';
      return;
    }

    const ticketArea = document.querySelector<HTMLElement>('.ticket-print-area');

    if (!ticketArea) {
      this.actionErrorMessage = 'No pudimos preparar el ticket para imprimir.';
      return;
    }

    const printWindow = window.open('', '_blank', 'width=380,height=640');

    if (!printWindow) {
      this.actionErrorMessage = 'Permite ventanas emergentes para imprimir el ticket.';
      return;
    }

    const documentTitle = this.buildTicketFileName(this.generatedTicket.order);
    const originalTitle = document.title;

    document.title = documentTitle;
    printWindow.document.open();
    printWindow.document.write(this.buildPrintableTicketHtml(ticketArea.outerHTML, documentTitle));
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      } finally {
        document.title = originalTitle;
      }
    }, 100);
  }

  public getTicketFolio(order: OrderResponse): string {
    return `T-${this.getShortOrderId(order.id)}`;
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

  private getSelectedPreparationMinutes(): number | null {
    const minutes = this.selectedPreparationTimeOption === 'custom'
      ? this.customPreparationMinutes
      : Number(this.selectedPreparationTimeOption);

    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
      return null;
    }

    return Math.round(minutes);
  }

  private generateOnlineTicket(order: OrderResponse): void {
    this.ticketGeneratingOrderId = order.id;
    this.actionErrorMessage = '';

    this.paymentApiService.getPaymentByOrderId(order.id)
      .pipe(
        finalize(() => {
          this.ticketGeneratingOrderId = null;
        })
      )
      .subscribe({
        next: payment => {
          if (payment.status !== 'Approved') {
            this.actionErrorMessage = 'No pudimos confirmar que el pago online esté aprobado.';
            return;
          }

          this.setGeneratedTicket(order, payment, 'Online', 'Pagado', payment.amount, 0);
        },
        error: error => {
          console.error('Payment lookup failed:', error);
          this.actionErrorMessage = 'No pudimos encontrar el pago del pedido.';
        }
      });
  }

  private setGeneratedTicket(
    order: OrderResponse,
    payment: PaymentResponse,
    paymentMethodLabel: string,
    paymentStatusLabel: string,
    amountReceived: number,
    changeAmount: number
  ): void {
    this.ticketGeneratedOrderIds.add(order.id);
    this.cashTicketOrderId = '';
    this.generatedTicket = {
      order,
      payment,
      generatedAt: new Date().toISOString(),
      paymentMethodLabel,
      paymentStatusLabel,
      amountReceived: this.roundCurrency(amountReceived),
      changeAmount: this.roundCurrency(changeAmount)
    };
  }

  private getCashAmountForTicket(order: OrderResponse): number | null {
    if (this.shouldAskCashSuggestion(order) && this.cashPaidWithSuggested) {
      return this.roundCurrency(order.cashAmountProvided!);
    }

    const value = Number(this.cashAmountReceived);

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    return this.roundCurrency(value);
  }

  private resetTicketForm(): void {
    this.cashTicketOrderId = '';
    this.cashPaidWithSuggested = true;
    this.cashAmountReceived = null;
    this.generatedTicket = null;
  }

  private isCashOrder(order: OrderResponse): boolean {
    return order.paymentMethod === 'Cash';
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private buildTicketFileName(order: OrderResponse): string {
    const orderShortId = this.getShortOrderId(order.id);
    const restaurantSlug = this.toFileSafeSlug(this.getRestaurantName()) || 'restaurante';
    const date = new Date(this.generatedTicket?.generatedAt ?? Date.now()).toISOString().slice(0, 10);

    return `ticket-${orderShortId}-${restaurantSlug}-tap2eat-${date}`;
  }

  private toFileSafeSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  private buildPrintableTicketHtml(ticketHtml: string, documentTitle: string): string {
    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>${documentTitle}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111827;
              font-family: "Courier New", monospace;
            }

            .ticket-print-area {
              width: 80mm;
              margin: 0;
              padding: 8px;
              border: 0;
              background: #ffffff;
              box-shadow: none;
            }

            .thermal-ticket {
              width: 100%;
              margin: 0;
              padding: 0;
              border: 0;
              background: #ffffff;
            }

            .thermal-ticket header {
              text-align: center;
            }

            .thermal-ticket h4,
            .thermal-ticket p {
              margin: 4px 0;
            }

            .thermal-ticket dl {
              margin: 0;
            }

            .thermal-ticket dl div,
            .ticket-item {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              margin-bottom: 7px;
            }

            .thermal-ticket dd {
              margin: 0;
              text-align: right;
              font-weight: 700;
            }

            .ticket-separator {
              margin: 12px 0;
              border-top: 1px dashed #9aa9bc;
            }

            .ticket-item div {
              display: grid;
            }

            .ticket-item b {
              white-space: nowrap;
            }

            .ticket-disclaimer {
              margin-top: 14px;
              text-align: center;
              font-size: 12px;
              font-weight: 700;
            }

            .no-print,
            .ticket-actions,
            button {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${ticketHtml}
        </body>
      </html>
    `;
  }

  private subscribeToRealtimeOrders(): void {
    this.realtimeOrdersSubscription?.unsubscribe();
    this.realtimePaymentsSubscription?.unsubscribe();

    this.realtimeOrdersSubscription = this.realtimeNotificationService
      .listenToRestaurantOrders(this.restaurantId)
      .subscribe(event => {
        if (event.restaurantId === this.restaurantId) {
          this.loadOrders();
        }
      });

    this.realtimePaymentsSubscription = this.realtimeNotificationService
      .listenToRestaurantPayments(this.restaurantId)
      .subscribe(event => {
        if (event.restaurantId === this.restaurantId) {
          this.loadOrders();
        }
      });
  }

  private getRestaurantFallback(restaurantId: string): string {
    return `Restaurante #${this.getShortId(restaurantId, 6)}`;
  }

  private getBranchFallback(branchId: string): string {
    return `Sucursal #${this.getShortId(branchId, 4)}`;
  }

  private getBranch(branchId: string): IBranchResponse | undefined {
    return this.branches.find(branch => branch.id === branchId);
  }

  private getCustomerFallback(customerAccountId: string): string {
    return `Cliente #${this.getShortId(customerAccountId, 5)}`;
  }

  private getShortId(value: string, length: number): string {
    return (value || '------').slice(-length).toUpperCase();
  }
}
