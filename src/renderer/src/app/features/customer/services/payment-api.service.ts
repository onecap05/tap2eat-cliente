import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApprovePaymentRequest,
  PaymentResponse,
  RejectPaymentRequest
} from '../models/payment.models';

@Injectable({
  providedIn: 'root'
})
export class PaymentApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/payments`;

  constructor(private readonly http: HttpClient) {}

  public getPaymentByOrderId(orderId: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.baseUrl}/order/${orderId}`);
  }

  public approvePayment(
    paymentId: string,
    request: ApprovePaymentRequest
  ): Observable<PaymentResponse> {
    return this.http.patch<PaymentResponse>(`${this.baseUrl}/${paymentId}/approve`, request);
  }

  public rejectPayment(paymentId: string, request: RejectPaymentRequest): Observable<PaymentResponse> {
    return this.http.patch<PaymentResponse>(`${this.baseUrl}/${paymentId}/reject`, request);
  }

  public cancelPayment(paymentId: string): Observable<PaymentResponse> {
    return this.http.patch<PaymentResponse>(`${this.baseUrl}/${paymentId}/cancel`, null);
  }
}
