import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';

import { PaymentSuccessComponent } from './payment-success.component';

describe('PaymentSuccessComponent', () => {
  let fixture: ComponentFixture<PaymentSuccessComponent>;
  let router: Router;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should navigate to confirmation with replaceUrl', async () => {
    vi.useFakeTimers();
    await configureComponent('order-1');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2400);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/customer/orders', 'order-1', 'confirmation'],
      { replaceUrl: true }
    );
  });

  it('should redirect to customer orders when order id is missing', async () => {
    await configureComponent(null);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/customer/orders'], { replaceUrl: true });
  });

  async function configureComponent(orderId: string | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PaymentSuccessComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'orderId' ? orderId : null
              }
            }
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockResolvedValue(true)
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(PaymentSuccessComponent);
  }
});
