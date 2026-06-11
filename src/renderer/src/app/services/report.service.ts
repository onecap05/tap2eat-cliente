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

    return params;
  }
}