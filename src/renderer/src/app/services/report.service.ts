import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly reportsApiUrl = `${environment.apiBaseUrl}/reports`;

  constructor(private readonly http: HttpClient) {}

  public getOwnerDashboard(restaurantId: string): Observable<OwnerDashboardReport> {
    const accessToken = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') || 'Bearer';

    const headers = accessToken
      ? new HttpHeaders({
          Authorization: `${tokenType} ${accessToken}`
        })
      : undefined;

    return this.http.get<OwnerDashboardReport>(
      `${this.reportsApiUrl}/dashboard/owner/${restaurantId}`,
      { headers }
    );
  }
}