import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface StatusMetric {
  status: string;
  total: number;
}

export interface ProductTypeMetric {
  productType: string;
  total: number;
}

export interface OrdersReport {
  totalOrders: number;
  salesOrderCount: number;
  totalSales: number;
  deliveredSales: number;
  averageTicket: number;
  createdOrders: number;
  acceptedOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  ordersByStatus: StatusMetric[];
}

export interface CatalogReport {
  totalProducts: number;
  availableProducts: number;
  pausedProducts: number;
  simpleProducts: number;
  customizableProducts: number;
  featuredProducts: number;
  productsWithCustomSchedule: number;
  totalCategories: number;
  activeCategories: number;
  productsByType: ProductTypeMetric[];
  productsByStatus: StatusMetric[];
}

export interface OwnerDashboardReport {
  restaurantId: string;
  orders: OrdersReport;
  catalog: CatalogReport;
}

export interface OwnerDashboardReportFilters {
  from?: string;
  to?: string;
  branchId?: string;
}

export interface OwnerAnalyticsSummary {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  deliveredOrders: number;
  cancelledOrders: number;
  cancellationRate: number;
  deliveredSales: number;
  totalProductsSold: number;
  predominantPaymentMethod?: string | null;
}

export interface SalesByDayMetric {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
}

export interface TopProductMetric {
  product: string;
  quantitySold: number;
  estimatedSales: number;
  salesPercentage?: number | null;
}

export interface OrdersByHourMetric {
  hour: string;
  totalOrders: number;
  totalSales: number;
}

export interface PaymentSummary {
  available: boolean;
  totalPayments: number;
  totalApproved: number;
  cash: number;
  online: number;
  pending: number;
  rejectedOrCancelled: number;
  approvedPayments: number;
  pendingPayments: number;
  cashAmountReceived: number;
  cashChangeAmount: number;
  message?: string | null;
}

export interface OwnerAnalyticsMetadata {
  restaurantName: string;
  restaurantRfc?: string | null;
  branchId?: string | null;
  branchName: string;
  branchFilterNote?: string | null;
}

export interface OrderDetailMetric {
  orderFolio: string;
  date: string;
  time: string;
  branch: string;
  customer: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal?: number | null;
  total: number;
  amountReceived?: number | null;
  changeAmount?: number | null;
  paymentProvider: string;
  paymentReference: string;
  itemsCount: number;
  notes: string;
}

export interface SoldProductDetailMetric {
  orderFolio: string;
  date: string;
  branch: string;
  product: string;
  quantity: number;
  unitPrice: number;
  productTotal: number;
  modifiers: string;
  orderStatus: string;
}

export interface OwnerAnalyticsReport {
  restaurantId: string;
  metadata: OwnerAnalyticsMetadata;
  summary: OwnerAnalyticsSummary;
  salesByDay: SalesByDayMetric[];
  topProducts: TopProductMetric[];
  ordersByHour: OrdersByHourMetric[];
  ordersByStatus: StatusMetric[];
  paymentSummary: PaymentSummary;
  orderDetails: OrderDetailMetric[];
  soldProductDetails: SoldProductDetailMetric[];
  catalog: CatalogReport;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly reportsApiUrl = `${environment.apiBaseUrl}/reports`;

  constructor(private readonly http: HttpClient) {}

  public getOwnerDashboard(
    restaurantId: string,
    filters?: OwnerDashboardReportFilters
  ): Observable<OwnerDashboardReport> {
    return this.http.get<OwnerDashboardReport>(
      `${this.reportsApiUrl}/dashboard/owner/${restaurantId}`,
      {
        headers: this.buildAuthHeaders(),
        params: this.buildDateParams(filters)
      }
    );
  }

  public exportOwnerDashboard(
    restaurantId: string,
    filters?: OwnerDashboardReportFilters
  ): Observable<Blob> {
    return this.http.get(
      `${this.reportsApiUrl}/dashboard/owner/${restaurantId}/export`,
      {
        headers: this.buildAuthHeaders(),
        params: this.buildDateParams(filters),
        responseType: 'blob'
      }
    );
  }

  public getOwnerAnalytics(
    restaurantId: string,
    filters?: OwnerDashboardReportFilters
  ): Observable<OwnerAnalyticsReport> {
    return this.http.get<OwnerAnalyticsReport>(
      `${this.reportsApiUrl}/dashboard/owner/${restaurantId}/analytics`,
      {
        headers: this.buildAuthHeaders(),
        params: this.buildDateParams(filters)
      }
    );
  }

  public exportOwnerAnalytics(
    restaurantId: string,
    filters?: OwnerDashboardReportFilters
  ): Observable<Blob> {
    return this.http.get(
      `${this.reportsApiUrl}/dashboard/owner/${restaurantId}/analytics/export`,
      {
        headers: this.buildAuthHeaders(),
        params: this.buildDateParams(filters),
        responseType: 'blob'
      }
    );
  }

  private buildAuthHeaders(): HttpHeaders | undefined {
    const accessToken = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') || 'Bearer';

    return accessToken
      ? new HttpHeaders({
          Authorization: `${tokenType} ${accessToken}`
        })
      : undefined;
  }

  private buildDateParams(filters?: OwnerDashboardReportFilters): HttpParams {
    let params = new HttpParams();

    if (filters?.from) {
      params = params.set('from', filters.from);
    }

    if (filters?.to) {
      params = params.set('to', filters.to);
    }

    if (filters?.branchId) {
      params = params.set('branchId', filters.branchId);
    }

    return params;
  }
}
