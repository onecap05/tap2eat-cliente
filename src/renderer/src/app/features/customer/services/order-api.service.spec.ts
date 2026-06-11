import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { CreateOrderRequest } from '../models/order.models';
import { OrderApiService } from './order-api.service';

describe('OrderApiService', () => {
  let service: OrderApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(OrderApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create order with POST /orders', () => {
    const request: CreateOrderRequest = {
      customerAccountId: 'customer-1',
      restaurantId: 'restaurant-1',
      branchId: 'branch-1',
      paymentMethod: 'Cash',
      cashPaymentType: 'UnknownAmount',
      cashAmountProvided: null,
      estimatedChange: null,
      items: [{ productId: 'product-1', quantity: 1, selectedModifierOptionIds: [] }]
    };

    service.createOrder(request).subscribe(response => {
      expect(response.id).toBe('order-1');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/orders`);

    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({ id: 'order-1' });
  });

  it('should get order by id with GET /orders/{id}', () => {
    service.getOrderById('order-1').subscribe(response => {
      expect(response.id).toBe('order-1');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/orders/order-1`);

    expect(httpRequest.request.method).toBe('GET');
    httpRequest.flush({ id: 'order-1' });
  });

  it('should get customer orders with query filters', () => {
    service.getCustomerOrders('customer-1', {
      status: 'Ready',
      from: '2026-05-01',
      to: '2026-05-22'
    }).subscribe(response => {
      expect(response.length).toBe(0);
    });

    const httpRequest = httpTestingController.expectOne(request =>
      request.url === `${environment.apiBaseUrl}/orders/customer/customer-1`
    );

    expect(httpRequest.request.method).toBe('GET');
    expect(httpRequest.request.params.get('status')).toBe('Ready');
    expect(httpRequest.request.params.get('from')).toBe('2026-05-01');
    expect(httpRequest.request.params.get('to')).toBe('2026-05-22');
    httpRequest.flush([]);
  });

  it('should get restaurant orders with GET /orders/restaurant/{id}', () => {
    service.getRestaurantOrders('restaurant-1').subscribe(response => {
      expect(response.length).toBe(0);
    });

    const httpRequest = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/orders/restaurant/restaurant-1`
    );

    expect(httpRequest.request.method).toBe('GET');
    httpRequest.flush([]);
  });

  it('should get branch orders with GET /orders/branch/{id}', () => {
    service.getBranchOrders('branch-1').subscribe(response => {
      expect(response.length).toBe(0);
    });

    const httpRequest = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/orders/branch/branch-1`
    );

    expect(httpRequest.request.method).toBe('GET');
    httpRequest.flush([]);
  });

  it('should update order status with PATCH /orders/{id}/status', () => {
    service.updateOrderStatus('order-1', 'Accepted').subscribe(response => {
      expect(response.status).toBe('Accepted');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/orders/order-1/status`);

    expect(httpRequest.request.method).toBe('PATCH');
    expect(httpRequest.request.body).toEqual({ status: 'Accepted' });
    httpRequest.flush({ id: 'order-1', status: 'Accepted' });
  });

  it('should update order status with estimated preparation minutes', () => {
    service.updateOrderStatus('order-1', 'Accepted', 20).subscribe(response => {
      expect(response.estimatedPreparationMinutes).toBe(20);
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseUrl}/orders/order-1/status`);

    expect(httpRequest.request.method).toBe('PATCH');
    expect(httpRequest.request.body).toEqual({
      status: 'Accepted',
      estimatedPreparationMinutes: 20
    });
    httpRequest.flush({
      id: 'order-1',
      status: 'Accepted',
      estimatedPreparationMinutes: 20,
      estimatedReadyAt: '2026-05-23T12:20:00Z'
    });
  });
});
