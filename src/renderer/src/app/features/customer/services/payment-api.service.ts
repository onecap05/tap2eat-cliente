import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    return this.http.patch<PaymentResponse>(
      `${this.baseUrl}/${paymentId}/approve`,
      request,
      this.getSimulationHeaders()
    );
  }

  public rejectPayment(paymentId: string, request: RejectPaymentRequest): Observable<PaymentResponse> {
    return this.http.patch<PaymentResponse>(
      `${this.baseUrl}/${paymentId}/reject`,
      request,
      this.getSimulationHeaders()
    );
  }

  public cancelPayment(paymentId: string): Observable<PaymentResponse> {
    return this.http.patch<PaymentResponse>(
      `${this.baseUrl}/${paymentId}/cancel`,
      null,
      this.getSimulationHeaders()
    );
  }

  private getSimulationHeaders(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        'X-Simulated-Payment-Token': environment.paymentSimulationToken
      })
    };
  }
}
