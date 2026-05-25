import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { PublicOrderTrackingApiService } from './public-order-tracking-api.service';

describe('PublicOrderTrackingApiService', () => {
  let service: PublicOrderTrackingApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PublicOrderTrackingApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should call public tracking endpoint without requiring the auth interceptor', () => {
    service.getByPublicTrackingCode('track-code-1').subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/orders/public/track/track-code-1`
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
