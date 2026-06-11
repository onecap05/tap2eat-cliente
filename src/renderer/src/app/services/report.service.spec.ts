import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ReportService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('should get owner analytics with date and branch filters', () => {
    service.getOwnerAnalytics('restaurant-1', {
      from: '2026-01-01',
      to: '2026-01-31',
      branchId: 'branch-1'
    }).subscribe(response => {
      expect(response.restaurantId).toBe('restaurant-1');
      expect(response.salesByDay.length).toBe(1);
    });

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/reports/dashboard/owner/restaurant-1/analytics?from=2026-01-01&to=2026-01-31&branchId=branch-1`
    );

    expect(request.request.method).toBe('GET');
    request.flush(analyticsResponse());
  });

  it('should not send branchId when it is not provided', () => {
    service.getOwnerAnalytics('restaurant-1', { from: '2026-01-01', to: '2026-01-31' })
      .subscribe(response => {
        expect(response.restaurantId).toBe('restaurant-1');
      });

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/reports/dashboard/owner/restaurant-1/analytics?from=2026-01-01&to=2026-01-31`
    );

    expect(request.request.method).toBe('GET');
    request.flush(analyticsResponse());
  });

  it('should export owner analytics as blob with branch filter', () => {
    service.exportOwnerAnalytics('restaurant-1', {
      from: '2026-01-01',
      to: '2026-01-31',
      branchId: 'branch-1'
    }).subscribe(response => {
      expect(response.size).toBe(4);
    });

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/reports/dashboard/owner/restaurant-1/analytics/export?from=2026-01-01&to=2026-01-31&branchId=branch-1`
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['test']));
  });
});

function analyticsResponse() {
  return {
    restaurantId: 'restaurant-1',
    metadata: {
      restaurantName: 'Restaurante Demo',
      restaurantRfc: 'TAP260520ABC',
      branchId: null,
      branchName: 'Todas las sucursales',
      branchFilterNote: null
    },
    summary: {
      totalSales: 100,
      totalOrders: 2,
      averageTicket: 50,
      deliveredOrders: 1,
      cancelledOrders: 0,
      cancellationRate: 0,
      deliveredSales: 100,
      totalProductsSold: 0,
      predominantPaymentMethod: null
    },
    salesByDay: [
      {
        date: '2026-01-01',
        totalSales: 100,
        totalOrders: 2,
        averageTicket: 50
      }
    ],
    topProducts: [],
    ordersByHour: [],
    ordersByStatus: [],
    paymentSummary: {
      available: true,
      totalPayments: 0,
      totalApproved: 0,
      cash: 0,
      online: 0,
      pending: 0,
      rejectedOrCancelled: 0,
      approvedPayments: 0,
      pendingPayments: 0,
      cashAmountReceived: 0,
      cashChangeAmount: 0,
      message: 'No hay pagos registrados para este rango.'
    },
    orderDetails: [],
    soldProductDetails: [],
    catalog: {
      totalProducts: 0,
      availableProducts: 0,
      pausedProducts: 0,
      simpleProducts: 0,
      customizableProducts: 0,
      featuredProducts: 0,
      productsWithCustomSchedule: 0,
      totalCategories: 0,
      activeCategories: 0,
      productsByType: [],
      productsByStatus: []
    }
  };
}
