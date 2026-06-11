import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IRestaurantResponse } from '../../../models/restaurant/IRestaurantResponse';
import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { ICategoryResponse } from '../../../models/category/ICategoryResponse';
import { IProductResponse } from '../../../models/product/IProductResponse';

import {
  OwnerDashboardReport,
  OwnerDashboardReportFilters,
  ReportService,
  StatusMetric
} from '../../../../../services/report.service';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css'
})
export class DashboardOverviewComponent implements OnChanges {
  @Input({ required: true }) restaurant!: IRestaurantResponse;
  @Input() branches: IBranchResponse[] = [];
  @Input() categories: ICategoryResponse[] = [];
  @Input() products: IProductResponse[] = [];
  @Output() openReports = new EventEmitter<void>();

  public report?: OwnerDashboardReport;
  public loadingReport = false;
  public exportingReport = false;
  public reportError = '';

  public reportFilters = {
    from: this.getTodayDateValue(),
    to: this.getTodayDateValue()
  };

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

    const filters = this.getValidatedReportFilters();

    if (!filters) {
      return;
    }

    this.loadedRestaurantId = restaurantId;
    this.loadingReport = true;
    this.reportError = '';

    this.reportService.getOwnerDashboard(restaurantId, filters).subscribe({
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

  public resetToToday(): void {
    this.setQuickRange('today');
  }

  public setQuickRange(range: 'today' | 'week' | 'month'): void {
    const today = this.getTodayDateValue();
    let from = today;

    if (range === 'week') {
      from = this.getDateValueFromOffset(-6);
    }

    if (range === 'month') {
      const currentDate = new Date();
      from = this.formatDateValue(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }

    this.reportFilters = {
      from,
      to: today
    };

    this.loadDashboardReport();
  }

  public exportDashboardReport(): void {
    const restaurantId = this.getRestaurantId();

    if (!restaurantId) {
      this.reportError = 'No se encontró el ID del restaurante.';
      return;
    }

    if (this.exportingReport) {
      return;
    }

    const filters = this.getValidatedReportFilters();

    if (!filters) {
      return;
    }

    this.exportingReport = true;
    this.reportError = '';

    this.reportService.exportOwnerDashboard(restaurantId, filters).subscribe({
      next: (file) => {
        this.downloadExcelFile(file, restaurantId, filters);
        this.exportingReport = false;
      },
      error: (error) => {
        console.error('Error exporting dashboard report:', error);
        this.reportError = 'No se pudo exportar el reporte a Excel.';
        this.exportingReport = false;
      }
    });
  }

  public getSelectedRangeLabel(): string {
    if (this.reportFilters.from === this.reportFilters.to) {
      return `Reporte del día ${this.reportFilters.from}`;
    }

    return `Reporte del ${this.reportFilters.from} al ${this.reportFilters.to}`;
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

  public getPendingOrders(): number {
    return (this.report?.orders.createdOrders ?? 0)
      + (this.report?.orders.acceptedOrders ?? 0)
      + (this.report?.orders.preparingOrders ?? 0)
      + (this.report?.orders.readyOrders ?? 0);
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

  private getValidatedReportFilters(): OwnerDashboardReportFilters | null {
    const from = this.reportFilters.from;
    const to = this.reportFilters.to;

    if (!from || !to) {
      this.reportError = 'Selecciona una fecha de inicio y una fecha de fin.';
      return null;
    }

    if (from > to) {
      this.reportError = 'La fecha de inicio no puede ser mayor que la fecha de fin.';
      return null;
    }

    return { from, to };
  }

  private downloadExcelFile(
    file: Blob,
    restaurantId: string,
    filters: OwnerDashboardReportFilters
  ): void {
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement('a');

    link.href = fileUrl;
    link.download = `tap2eat-report-${restaurantId}-${filters.from}-${filters.to}.xlsx`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  }

  private getTodayDateValue(): string {
    return this.formatDateValue(new Date());
  }

  private getDateValueFromOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return this.formatDateValue(date);
  }

  private formatDateValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getRestaurantId(): string | null {
    const restaurantValue = this.restaurant as unknown as {
      id?: string;
      _id?: string;
    };

    return restaurantValue.id || restaurantValue._id || null;
  }
}
