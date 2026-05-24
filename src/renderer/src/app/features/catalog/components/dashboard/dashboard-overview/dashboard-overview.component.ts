import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { IRestaurantResponse } from '../../../models/restaurant/IRestaurantResponse';
import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { IProductResponse } from '../../../models/product/IProductResponse';

import {
  OwnerDashboardReport,
  ReportService,
  StatusMetric
} from '../../../../../services/report.service';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css'
})
export class DashboardOverviewComponent implements OnChanges {
  @Input({ required: true }) restaurant!: IRestaurantResponse;
  @Input() branches: IBranchResponse[] = [];
  @Input() categories: ICategoryResponse[] = [];
  @Input() products: IProductResponse[] = [];

  public report?: OwnerDashboardReport;
  public loadingReport = false;
  public reportError = '';

  private loadedRestaurantId = '';

  constructor(private readonly reportService: ReportService) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['restaurant'] && this.restaurant) {
      this.loadDashboardReport();
    }
  }

  public loadDashboardReport(): void {
    const restaurantId = this.getRestaurantId();

    if (!restaurantId) {
      this.reportError = 'No se encontró el ID del restaurante.';
      return;
    }

    if (this.loadingReport) {
      return;
    }

    this.loadedRestaurantId = restaurantId;
    this.loadingReport = true;
    this.reportError = '';

    this.reportService.getOwnerDashboard(restaurantId).subscribe({
      next: (report: OwnerDashboardReport) => {
        this.report = report;
        this.loadingReport = false;
      },
      error: (error) => {
        console.error('Error loading dashboard report:', error);
        this.reportError = 'No se pudieron cargar las métricas reales del dashboard.';
        this.loadingReport = false;
      }
    });
  }

  public getTotalOrders(): number {
    return this.report?.orders.totalOrders ?? 0;
  }

  public getTotalSales(): number {
    return this.report?.orders.totalSales ?? 0;
  }

  public getAverageTicket(): number {
    return this.report?.orders.averageTicket ?? 0;
  }

  public getDeliveredOrders(): number {
    return this.report?.orders.deliveredOrders ?? 0;
  }

  public getCancelledOrders(): number {
    return this.report?.orders.cancelledOrders ?? 0;
  }

  public getTotalCategories(): number {
    return this.report?.catalog.totalCategories ?? this.categories.length;
  }

  public getAvailableProducts(): number {
    return this.report?.catalog.availableProducts ?? 0;
  }

  public getPausedProducts(): number {
    return this.report?.catalog.pausedProducts ?? 0;
  }

  public getOrderStatusMetrics(): StatusMetric[] {
    return this.report?.orders.ordersByStatus ?? [];
  }

  public getProductStatusMetrics(): StatusMetric[] {
    return this.report?.catalog.productsByStatus ?? [];
  }

  public getStatusLabel(status: string): string {
    const normalizedStatus = status.toUpperCase();

    const labels: Record<string, string> = {
      CREATED: 'Creadas',
      ACCEPTED: 'Aceptadas',
      PREPARING: 'En preparación',
      READY: 'Listas',
      DELIVERED: 'Entregadas',
      CANCELLED: 'Canceladas',
      AVAILABLE: 'Disponibles',
      TEMPORARILY_UNAVAILABLE: 'Pausados',
      PAUSED: 'Pausados',
      UNAVAILABLE: 'No disponibles',
      OUT_OF_STOCK: 'Agotados',
      UNKNOWN: 'Sin estado'
    };

    return labels[normalizedStatus] ?? status;
  }

  public getOrderStatusPercent(total: number): number {
    const maxTotal = Math.max(
      ...this.getOrderStatusMetrics().map(metric => metric.total),
      0
    );

    if (maxTotal === 0) {
      return 0;
    }

    return Math.max((total / maxTotal) * 100, 8);
  }

  public getProductStatusPercent(total: number): number {
    const maxTotal = Math.max(
      ...this.getProductStatusMetrics().map(metric => metric.total),
      0
    );

    if (maxTotal === 0) {
      return 0;
    }

    return Math.max((total / maxTotal) * 100, 8);
  }

  private getRestaurantId(): string | null {
    const restaurantValue = this.restaurant as unknown as {
      id?: string;
      _id?: string;
    };

    return restaurantValue.id || restaurantValue._id || null;
  }
}