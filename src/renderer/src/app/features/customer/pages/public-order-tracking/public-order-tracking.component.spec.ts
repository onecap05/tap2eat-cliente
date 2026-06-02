import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { PublicOrderTrackingResponse } from '../../models/order.models';
import { PublicOrderTrackingApiService } from '../../services/public-order-tracking-api.service';
import { PublicOrderTrackingComponent } from './public-order-tracking.component';

class FakePublicOrderTrackingApiService {
  public response: PublicOrderTrackingResponse = order();
  public error: unknown | null = null;
  public lastCode = '';

  public getByPublicTrackingCode(publicTrackingCode: string) {
    this.lastCode = publicTrackingCode;

    return this.error
      ? throwError(() => this.error)
      : of(this.response);
  }
}

describe('PublicOrderTrackingComponent', () => {
  let fixture: ComponentFixture<PublicOrderTrackingComponent>;
  let component: PublicOrderTrackingComponent;
  let service: FakePublicOrderTrackingApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicOrderTrackingComponent],
      providers: [
        provideRouter([]),
        { provide: PublicOrderTrackingApiService, useClass: FakePublicOrderTrackingApiService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'publicTrackingCode' ? 'track-code-1' : null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicOrderTrackingComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(PublicOrderTrackingApiService) as unknown as FakePublicOrderTrackingApiService;
  });

  it('should load public order by tracking code', () => {
    fixture.detectChanges();

    expect(service.lastCode).toBe('track-code-1');
    expect(component.order?.publicTrackingCode).toBe('track-code-1');
    expect(fixture.nativeElement.textContent).toContain('Pedido #ABC12345');
    expect(fixture.nativeElement.textContent).toContain('Pedido aceptado');
  });

  it('should show not found state when API returns 404', () => {
    service.error = new HttpErrorResponse({ status: 404 });

    fixture.detectChanges();

    expect(component.notFound).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Pedido no encontrado');
  });

  it('should show general error state when API fails', () => {
    service.error = new HttpErrorResponse({ status: 500 });

    fixture.detectChanges();

    expect(component.errorMessage).toContain('No pudimos cargar');
  });

  it('should mark progress steps through current status', () => {
    fixture.detectChanges();

    expect(component.isStepActive('Created')).toBe(true);
    expect(component.isStepActive('Accepted')).toBe(true);
    expect(component.isStepActive('Preparing')).toBe(false);
  });

  it('should show estimated ready time when available', () => {
    service.response = {
      ...order(),
      estimatedPreparationMinutes: 20,
      estimatedReadyAt: '2026-05-25T12:25:00Z'
    };

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Listo para recoger aproximadamente');
  });
});

function order(): PublicOrderTrackingResponse {
  return {
    publicTrackingCode: 'track-code-1',
    shortOrderId: 'ABC12345',
    status: 'Accepted',
    restaurantNameSnapshot: null,
    branchNameSnapshot: null,
    items: [
      {
        productNameSnapshot: 'Taco',
        quantity: 2,
        unitPriceSnapshot: 50,
        selectedModifiers: [],
        subtotal: 100
      }
    ],
    subtotal: 100,
    total: 100,
    createdAt: '2026-05-25T12:00:00Z',
    updatedAt: '2026-05-25T12:05:00Z'
  };
}
