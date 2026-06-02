import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateOrderRequest,
  OrderQueryFilters,
  OrderResponse,
  UpdateOrderStatusRequest
} from '../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class OrderApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/orders`;

  constructor(private readonly http: HttpClient) {}

  public createOrder(request: CreateOrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.baseUrl, request);
  }

  public getOrderById(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.baseUrl}/${orderId}`);
  }

  public getCustomerOrders(
    customerAccountId: string,
    filters?: OrderQueryFilters
  ): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(
      `${this.baseUrl}/customer/${customerAccountId}`,
      { params: this.buildParams(filters) }
    );
  }

  public getRestaurantOrders(
    restaurantId: string,
    filters?: OrderQueryFilters
  ): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(
      `${this.baseUrl}/restaurant/${restaurantId}`,
      { params: this.buildParams(filters) }
    );
  }

  public getBranchOrders(branchId: string, filters?: OrderQueryFilters): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(
      `${this.baseUrl}/branch/${branchId}`,
      { params: this.buildParams(filters) }
    );
  }

  public updateOrderStatus(
    orderId: string,
    status: string,
    estimatedPreparationMinutes?: number | null
  ): Observable<OrderResponse> {
    const request: UpdateOrderStatusRequest = estimatedPreparationMinutes === undefined
      ? { status }
      : { status, estimatedPreparationMinutes };

    return this.http.patch<OrderResponse>(`${this.baseUrl}/${orderId}/status`, request);
  }

  private buildParams(filters?: OrderQueryFilters): HttpParams {
    let params = new HttpParams();

    if (!filters) {
      return params;
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.from) {
      params = params.set('from', filters.from);
    }

    if (filters.to) {
      params = params.set('to', filters.to);
    }

    return params;
  }
}
