import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, Subscription } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { RealtimeNotificationService } from '../../../../services/realtime-notification.service';
import { CustomerBranchResponse, CustomerRestaurantResponse } from '../../models/customer-catalog.models';
import { OrderResponse } from '../../models/order.models';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
import { OrderApiService } from '../../services/order-api.service';

type CustomerOrdersTab = 'active' | 'delivered';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-orders.component.html',
  styleUrl: './customer-orders.component.css'
})
export class CustomerOrdersComponent implements OnInit, OnDestroy {
  public selectedTab: CustomerOrdersTab = 'active';
  public orders: OrderResponse[] = [];
  public isLoading = false;
  public errorMessage = '';
  public restaurantNames = new Map<string, string>();
  public branchNames = new Map<string, string>();
  private customerAccountId: string | null = null;
  private realtimeOrdersSubscription: Subscription | null = null;
  private realtimePaymentsSubscription: Subscription | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly orderApiService: OrderApiService,
    private readonly customerCatalogApiService: CustomerCatalogApiService,
    private readonly realtimeNotificationService: RealtimeNotificationService
  ) {}

  public ngOnInit(): void {
    this.customerAccountId = this.authService.getAccountId();
    this.loadOrders();

    if (this.customerAccountId) {
      this.realtimeOrdersSubscription = this.realtimeNotificationService
        .listenToCustomerOrders(this.customerAccountId)
        .subscribe(event => {
          if (event.customerAccountId === this.customerAccountId) {
            this.loadOrders();
          }
        });

      this.realtimePaymentsSubscription = this.realtimeNotificationService
        .listenToCustomerPayments(this.customerAccountId)
        .subscribe(event => {
          if (event.customerAccountId === this.customerAccountId) {
            this.loadOrders();
          }
        });
    }
  }

  public ngOnDestroy(): void {
    this.realtimeOrdersSubscription?.unsubscribe();
    this.realtimePaymentsSubscription?.unsubscribe();
  }

  public get filteredOrders(): OrderResponse[] {
    if (this.selectedTab === 'delivered') {
      return this.orders.filter(order => order.status === 'Delivered');
    }

    return this.orders.filter(order => order.status !== 'Delivered');
  }

  public get visibleOrders(): OrderResponse[] {
    return this.filteredOrders;
  }

  public loadOrders(): void {
    const customerAccountId = this.customerAccountId ?? this.authService.getAccountId();

    if (!customerAccountId) {
      this.errorMessage = 'No pudimos identificar tu cuenta. Inicia sesión de nuevo.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.orderApiService.getCustomerOrders(customerAccountId).subscribe({
      next: orders => {
        this.orders = [...orders].sort(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
        );
        this.resolveCatalogNames(this.orders);
      },
      error: error => {
        console.error('Customer orders load failed:', error);
        this.errorMessage = 'No pudimos cargar tus pedidos.';
        this.isLoading = false;
      }
    });
  }

  public setTab(tab: CustomerOrdersTab): void {
    this.selectedTab = tab;
  }

  public setOrderTab(tab: CustomerOrdersTab): void {
    this.setTab(tab);
  }

  public getShortOrderCode(orderId?: string | null): string {
    if (!orderId) {
      return '#------';
    }

    return `#${orderId.slice(-8).toUpperCase()}`;
  }

  public getStatusLabel(status?: string | null): string {
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
        return 'Pedido';
    }
  }

  public getStatusClass(status?: string | null): string {
    switch (status) {
      case 'Created':
        return 'status-received';
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
        return 'status-received';
    }
  }

  public getMainActionLabel(order: OrderResponse): string {
    if (order.status === 'Delivered') {
      return 'Ver comprobante';
    }

    if (order.status === 'Cancelled') {
      return 'Ver pedido';
    }

    return 'Ver seguimiento';
  }

  public getProductCount(order: OrderResponse): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  public getProductPreview(order: OrderResponse): string {
    if (!order.items.length) {
      return 'Sin productos';
    }

    return order.items
      .slice(0, 2)
      .map(item => item.productNameSnapshot)
      .join(' · ');
  }

  public getRestaurantLabel(restaurantId?: string | null): string {
    if (!restaurantId) {
      return 'Restaurante no disponible';
    }

    return this.restaurantNames.get(restaurantId) ?? this.getRestaurantFallback(restaurantId);
  }

  public getBranchLabel(branchId?: string | null): string {
    if (!branchId) {
      return 'Sucursal no disponible';
    }

    return this.branchNames.get(branchId) ?? this.getBranchFallback(branchId);
  }

  public getOrderTime(order: OrderResponse): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(order.createdAt));
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  public formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  private resolveCatalogNames(orders: OrderResponse[]): void {
    const restaurantIds = [...new Set(orders.map(order => order.restaurantId).filter(Boolean))];

    if (!restaurantIds.length) {
      this.isLoading = false;
      return;
    }

    forkJoin(restaurantIds.map(restaurantId =>
      forkJoin({
        restaurant: this.customerCatalogApiService.getRestaurant(restaurantId)
          .pipe(catchError(() => of(null as CustomerRestaurantResponse | null))),
        branches: this.customerCatalogApiService.getBranches(restaurantId)
          .pipe(catchError(() => of([] as CustomerBranchResponse[])))
      }).pipe(map(result => ({ restaurantId, ...result })))
    )).subscribe({
      next: results => {
        results.forEach(result => {
          if (result.restaurant?.name) {
            this.restaurantNames.set(result.restaurantId, result.restaurant.name);
          }

          result.branches.forEach(branch => {
            if (branch.name) {
              this.branchNames.set(branch.id, branch.name);
            }
          });
        });

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private getRestaurantFallback(restaurantId: string): string {
    return `Restaurante #${this.getShortId(restaurantId, 6)}`;
  }

  private getBranchFallback(branchId: string): string {
    return `Sucursal #${this.getShortId(branchId, 4)}`;
  }

  private getShortId(value: string, length: number): string {
    return value.slice(-length).toUpperCase();
  }
}
