import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IBranchResponse } from '../../../models/branch/IBranchResponse';
import { IRestaurantResponse } from '../../../models/restaurant/IRestaurantResponse';
import {
  OwnerAnalyticsReport,
  OwnerDashboardReportFilters,
  ReportService,
  StatusMetric
} from '../../../../../services/report.service';

@Component({
  selector: 'app-owner-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './owner-reports.component.html',
  styleUrl: './owner-reports.component.css'
})
export class OwnerReportsComponent implements OnChanges {
  @Input({ required: true }) restaurant!: IRestaurantResponse;
  @Input() branches: IBranchResponse[] = [];

  public report?: OwnerAnalyticsReport;
  public loading = false;
  public exporting = false;
  public errorMessage = '';
  public selectedBranchId = 'all';
  public filters = {
    from: this.getTodayDateValue(),
    to: this.getTodayDateValue()
  };

  constructor(private readonly reportService: ReportService) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['restaurant'] && this.restaurant) {
      this.selectedBranchId = 'all';
      this.loadReport();
    }
  }

  public loadReport(): void {
    const restaurantId = this.getRestaurantId();

    if (!restaurantId) {
      this.errorMessage = 'No se encontr\u00f3 el ID del restaurante.';
      return;
    }

    const filters = this.getValidatedFilters();

    if (!filters || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.reportService.getOwnerAnalytics(restaurantId, filters).subscribe({
      next: report => {
        this.report = report;
        this.loading = false;
      },
      error: error => {
        console.error('Error loading owner analytics report:', error);
        this.errorMessage = 'No se pudieron cargar los reportes del restaurante.';
        this.loading = false;
      }
    });
  }

  public onBranchChange(): void {
    this.loadReport();
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

    this.filters = { from, to: today };
    this.loadReport();
  }

  public exportReport(): void {
    const restaurantId = this.getRestaurantId();

    if (!restaurantId) {
      this.errorMessage = 'No se encontr\u00f3 el ID del restaurante.';
      return;
    }

    const filters = this.getValidatedFilters();

    if (!filters || this.exporting) {
      return;
    }

    this.exporting = true;
    this.errorMessage = '';

    this.reportService.exportOwnerAnalytics(restaurantId, filters).subscribe({
      next: file => {
        this.downloadExcelFile(file, restaurantId, filters);
        this.exporting = false;
      },
      error: error => {
        console.error('Error exporting owner analytics report:', error);
        this.errorMessage = 'No se pudo exportar el reporte a Excel.';
        this.exporting = false;
      }
    });
  }

  public getSalesByDayPercent(totalSales: number): number {
    const max = Math.max(...(this.report?.salesByDay.map(metric => metric.totalSales) ?? []), 0);
    return max > 0 ? Math.max((totalSales / max) * 100, 6) : 0;
  }

  public getOrdersByHourPercent(totalOrders: number): number {
    const max = Math.max(...(this.report?.ordersByHour.map(metric => metric.totalOrders) ?? []), 0);
    return max > 0 ? Math.max((totalOrders / max) * 100, 6) : 0;
  }

  public getStatusPercent(metric: StatusMetric): number {
    const max = Math.max(...(this.report?.ordersByStatus.map(item => item.total) ?? []), 0);
    return max > 0 ? Math.max((metric.total / max) * 100, 6) : 0;
  }

  public hasPaymentData(): boolean {
    return Boolean(this.report?.paymentSummary.available && this.report.paymentSummary.totalPayments > 0);
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      CREATED: 'Creadas',
      ACCEPTED: 'Aceptadas',
      PREPARING: 'En preparaci\u00f3n',
      READY: 'Listas',
      DELIVERED: 'Entregadas',
      CANCELLED: 'Canceladas'
    };

    return labels[status.toUpperCase()] ?? status;
  }

  private getValidatedFilters(): OwnerDashboardReportFilters | null {
    if (!this.filters.from || !this.filters.to) {
      this.errorMessage = 'Selecciona una fecha de inicio y una fecha de fin.';
      return null;
    }

    if (this.filters.from > this.filters.to) {
      this.errorMessage = 'La fecha de inicio no puede ser mayor que la fecha de fin.';
      return null;
    }

    return {
      from: this.filters.from,
      to: this.filters.to,
      branchId: this.selectedBranchId === 'all' ? undefined : this.selectedBranchId
    };
  }

  private downloadExcelFile(
    file: Blob,
    restaurantId: string,
    filters: OwnerDashboardReportFilters
  ): void {
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement('a');

    link.href = fileUrl;
    link.download = `tap2eat-reportes-${restaurantId}-${filters.from}-${filters.to}.xlsx`;
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
    const restaurantValue = this.restaurant as unknown as { id?: string; _id?: string };
    return restaurantValue.id || restaurantValue._id || null;
  }
}
