import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { PaymentApiService } from './payment-api.service';

describe('PaymentApiService', () => {
  let service: PaymentApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PaymentApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should get payment by order id with GET /payments/order/{orderId}', () => {
    service.getPaymentByOrderId('order-1').subscribe(response => {
      expect(response.orderId).toBe('order-1');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/payments/order/order-1`);

    expect(httpRequest.request.method).toBe('GET');
    expect(httpRequest.request.headers.has('X-Simulated-Payment-Token')).toBe(false);
    httpRequest.flush({ id: 'payment-1', orderId: 'order-1' });
  });

  it('should approve payment with PATCH /payments/{id}/approve and simulation token header', () => {
    const request = { providerReference: 'WEB-order-1' };

    service.approvePayment('payment-1', request).subscribe(response => {
      expect(response.status).toBe('Approved');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/payments/payment-1/approve`);

    expect(httpRequest.request.method).toBe('PATCH');
    expect(httpRequest.request.body).toEqual(request);
    expect(httpRequest.request.headers.get('X-Simulated-Payment-Token'))
      .toBe(environment.paymentSimulationToken);
    httpRequest.flush({ id: 'payment-1', status: 'Approved' });
  });

  it('should reject payment with PATCH /payments/{id}/reject and simulation token header', () => {
    const request = { rejectionReason: 'Fondos insuficientes' };

    service.rejectPayment('payment-1', request).subscribe(response => {
      expect(response.status).toBe('Rejected');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/payments/payment-1/reject`);

    expect(httpRequest.request.method).toBe('PATCH');
    expect(httpRequest.request.body).toEqual(request);
    expect(httpRequest.request.headers.get('X-Simulated-Payment-Token'))
      .toBe(environment.paymentSimulationToken);
    httpRequest.flush({ id: 'payment-1', status: 'Rejected' });
  });

  it('should cancel payment with PATCH /payments/{id}/cancel and simulation token header', () => {
    service.cancelPayment('payment-1').subscribe(response => {
      expect(response.status).toBe('Cancelled');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/payments/payment-1/cancel`);

    expect(httpRequest.request.method).toBe('PATCH');
    expect(httpRequest.request.body).toBeNull();
    expect(httpRequest.request.headers.get('X-Simulated-Payment-Token'))
      .toBe(environment.paymentSimulationToken);
    httpRequest.flush({ id: 'payment-1', status: 'Cancelled' });
  });
});
