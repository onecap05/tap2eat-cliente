import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import {
  OwnerAnalyticsReport,
  OwnerDashboardReportFilters,
  ReportService
} from '../../../../../services/report.service';
import { OwnerReportsComponent } from './owner-reports.component';

class FakeReportService {
  public lastAnalyticsRequest: { restaurantId: string; filters?: OwnerDashboardReportFilters } | null = null;
  public lastExportRequest: { restaurantId: string; filters?: OwnerDashboardReportFilters } | null = null;
  public exportCalls = 0;
  public report = analyticsReport();
  public shouldFail = false;

  public getOwnerAnalytics(restaurantId: string, filters?: OwnerDashboardReportFilters) {
    this.lastAnalyticsRequest = { restaurantId, filters };
    return this.shouldFail
      ? throwError(() => new Error('report failed'))
      : of(this.report);
  }

  public exportOwnerAnalytics(restaurantId: string, filters?: OwnerDashboardReportFilters) {
    this.exportCalls++;
    this.lastExportRequest = { restaurantId, filters };
    return of(new Blob(['xlsx']));
  }
}

describe('OwnerReportsComponent', () => {
  let fixture: ComponentFixture<OwnerReportsComponent>;
  let component: OwnerReportsComponent;
  let reportService: FakeReportService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerReportsComponent],
      providers: [
        { provide: ReportService, useClass: FakeReportService }
      ]
    }).compileComponents();

    reportService = TestBed.inject(ReportService) as unknown as FakeReportService;
    fixture = TestBed.createComponent(OwnerReportsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('restaurant', {
      id: 'restaurant-1',
      ownerAccountId: 'owner-1',
      name: 'Restaurante Demo',
      active: true
    });
    fixture.componentRef.setInput('branches', [
      {
        id: 'branch-1',
        restaurantId: 'restaurant-1',
        name: 'Sucursal Centro',
        formattedAddress: 'Centro',
        latitude: 0,
        longitude: 0,
        isMainBranch: true,
        active: true
      }
    ]);
  });

  it('should load analytics with current range and all branches by default', () => {
    fixture.detectChanges();

    expect(reportService.lastAnalyticsRequest?.restaurantId).toBe('restaurant-1');
    expect(reportService.lastAnalyticsRequest?.filters?.branchId).toBeUndefined();
    expect(component.report?.summary.totalSales).toBe(300);
  });

  it('should send branchId when a branch is selected', () => {
    fixture.detectChanges();

    component.selectedBranchId = 'branch-1';
    component.onBranchChange();

    expect(reportService.lastAnalyticsRequest?.filters?.branchId).toBe('branch-1');
  });

  it('should not send branchId when all branches are selected', () => {
    fixture.detectChanges();

    component.selectedBranchId = 'all';
    component.onBranchChange();

    expect(reportService.lastAnalyticsRequest?.filters?.branchId).toBeUndefined();
  });

  it('should render sales by day, top products, peak hours and payments', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Ventas por día');
    expect(text).toContain('2026-01-01');
    expect(text).toContain('Taco');
    expect(text).toContain('12:00');
    expect(text).toContain('Exportar reporte detallado');
    expect(text).toContain('Pagos aprobados');
  });

  it('should show empty state when top products are missing', () => {
    reportService.report = {
      ...analyticsReport(),
      topProducts: []
    };

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay información suficiente para calcular productos vendidos.'
    );
  });

  it('should show friendly error when analytics fails', () => {
    reportService.shouldFail = true;

    fixture.detectChanges();

    expect(component.errorMessage).toContain('No se pudieron cargar');
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar');
  });

  it('should export analytics report with selected branch', () => {
    fixture.detectChanges();

    component.selectedBranchId = 'branch-1';
    component.exportReport();

    expect(reportService.exportCalls).toBe(1);
    expect(reportService.lastExportRequest?.filters?.branchId).toBe('branch-1');
  });
});

function analyticsReport(): OwnerAnalyticsReport {
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
      totalSales: 300,
      totalOrders: 4,
      averageTicket: 75,
      deliveredOrders: 3,
      cancelledOrders: 1,
      cancellationRate: 25,
      deliveredSales: 240,
      totalProductsSold: 5,
      predominantPaymentMethod: 'Efectivo'
    },
    salesByDay: [
      { date: '2026-01-01', totalSales: 100, totalOrders: 2, averageTicket: 50 },
      { date: '2026-01-02', totalSales: 200, totalOrders: 2, averageTicket: 100 }
    ],
    topProducts: [
      { product: 'Taco', quantitySold: 3, estimatedSales: 150, salesPercentage: 50 }
    ],
    ordersByHour: [
      { hour: '12:00', totalOrders: 3, totalSales: 180 }
    ],
    ordersByStatus: [
      { status: 'CREATED', total: 1 },
      { status: 'ACCEPTED', total: 0 },
      { status: 'PREPARING', total: 0 },
      { status: 'READY', total: 0 },
      { status: 'DELIVERED', total: 3 },
      { status: 'CANCELLED', total: 1 }
    ],
    paymentSummary: {
      available: true,
      totalPayments: 2,
      totalApproved: 240,
      cash: 120,
      online: 120,
      pending: 0,
      rejectedOrCancelled: 0,
      approvedPayments: 2,
      pendingPayments: 0,
      cashAmountReceived: 150,
      cashChangeAmount: 30,
      message: null
    },
    orderDetails: [],
    soldProductDetails: [],
    catalog: {
      totalProducts: 2,
      availableProducts: 1,
      pausedProducts: 1,
      simpleProducts: 1,
      customizableProducts: 1,
      featuredProducts: 0,
      productsWithCustomSchedule: 0,
      totalCategories: 1,
      activeCategories: 1,
      productsByType: [],
      productsByStatus: []
    }
  };
}
