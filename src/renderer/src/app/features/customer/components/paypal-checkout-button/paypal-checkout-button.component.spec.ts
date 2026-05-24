import { vi } from 'vitest';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { PaymentApiService } from '../../services/payment-api.service';
import { PayPalCheckoutButtonComponent } from './paypal-checkout-button.component';

class FakePaymentApiService {
  public createPayPalOrderCalls = 0;
  public capturePayPalOrderCalls = 0;
  public shouldFailCapture = false;

  public createPayPalOrder(paymentId: string) {
    this.createPayPalOrderCalls++;
    return of({
      paymentId,
      paypalOrderId: 'paypal-order-1',
      status: 'CREATED',
      amount: 100,
      currency: 'MXN'
    });
  }

  public capturePayPalOrder(paymentId: string, paypalOrderId: string) {
    this.capturePayPalOrderCalls++;

    if (this.shouldFailCapture) {
      return throwError(() => new Error('capture failed'));
    }

    return of({
      paymentId,
      paypalOrderId,
      captureId: 'capture-1',
      paymentStatus: 'Approved',
      providerReference: 'capture-1'
    });
  }
}

describe('PayPalCheckoutButtonComponent', () => {
  let fixture: ComponentFixture<PayPalCheckoutButtonComponent>;
  let component: PayPalCheckoutButtonComponent;
  let paymentApiService: FakePaymentApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayPalCheckoutButtonComponent],
      providers: [
        { provide: PaymentApiService, useClass: FakePaymentApiService }
      ]
    }).compileComponents();

    paymentApiService = TestBed.inject(PaymentApiService) as unknown as FakePaymentApiService;
    fixture = TestBed.createComponent(PayPalCheckoutButtonComponent);
    component = fixture.componentInstance;
    component.paymentId = 'payment-1';
    component.orderId = 'order-1';
  });

  afterEach(() => {
    environment.paypalClientId = '';
    vi.restoreAllMocks();
  });

  it('should initialize without throwing when PayPal client id is configured', async () => {
    environment.paypalClientId = 'sandbox-client-id';
    component.loadPayPalScript = vi.fn().mockResolvedValue(paypalButtons()) as never;

    expect(() => fixture.detectChanges()).not.toThrow();
    await Promise.resolve();
    await fixture.whenStable();
  });

  it('should show loading state without throwing when PayPal client id is configured', async () => {
    environment.paypalClientId = 'sandbox-client-id';
    const loadScriptSpy = vi.fn().mockReturnValue(new Promise(() => undefined));
    component.loadPayPalScript = loadScriptSpy as never;

    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando PayPal');
    expect(loadScriptSpy).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 'sandbox-client-id'
    }));
  });

  it('should show missing configuration state when PayPal client id is empty', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('PayPal Sandbox no esta configurado');
  });

  it('should create PayPal order through PaymentApiService', async () => {
    const paypalOrderId = await component.createPayPalOrder();

    expect(paypalOrderId).toBe('paypal-order-1');
    expect(paymentApiService.createPayPalOrderCalls).toBe(1);
  });

  it('should emit paymentCaptured when capture succeeds', async () => {
    const capturedSpy = vi.spyOn(component.paymentCaptured, 'emit');

    await component.handlePayPalApproved('paypal-order-1');

    expect(paymentApiService.capturePayPalOrderCalls).toBe(1);
    expect(capturedSpy).toHaveBeenCalledWith(expect.objectContaining({
      paymentStatus: 'Approved'
    }));
  });

  it('should emit paymentFailed when capture fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedSpy = vi.spyOn(component.paymentFailed, 'emit');
    paymentApiService.shouldFailCapture = true;

    await component.handlePayPalApproved('paypal-order-1');

    expect(failedSpy).toHaveBeenCalledWith('No pudimos completar el pago con PayPal. Intenta de nuevo.');
  });

  it('should emit paymentFailed when PayPal is cancelled', () => {
    const failedSpy = vi.spyOn(component.paymentFailed, 'emit');

    component.handlePayPalCancelled();

    expect(failedSpy).toHaveBeenCalledWith('Pago cancelado. Puedes intentarlo de nuevo.');
  });

  it('should emit paymentFailed when PayPal reports an error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedSpy = vi.spyOn(component.paymentFailed, 'emit');

    component.handlePayPalError(new Error('paypal failed'));

    expect(failedSpy).toHaveBeenCalledWith('No pudimos completar el pago con PayPal. Intenta de nuevo.');
  });

  function paypalButtons() {
    return {
      Buttons: vi.fn(() => ({
        render: vi.fn().mockResolvedValue(undefined)
      }))
    };
  }
});
