import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { RecommendationApiService } from './recommendation-api.service';

describe('RecommendationApiService', () => {
  let service: RecommendationApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(RecommendationApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('builds nearby URL with lat lng and radiusKm', () => {
    service.getNearbyRecommendations(19.43, -99.13, 5).subscribe();

    const request = httpTestingController.expectOne(req =>
      req.url === `${environment.apiBaseUrl}/recommendations/nearby`
      && req.params.get('lat') === '19.43'
      && req.params.get('lng') === '-99.13'
      && req.params.get('radiusKm') === '5'
    );

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('builds customer recommendations URL', () => {
    service.getCustomerRecommendations('customer-1', 19.43, -99.13, 5).subscribe();

    const request = httpTestingController.expectOne(req =>
      req.url === `${environment.apiBaseUrl}/recommendations/customers/customer-1`
      && req.params.get('lat') === '19.43'
      && req.params.get('lng') === '-99.13'
      && req.params.get('radiusKm') === '5'
    );

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('builds customer recommendation sections URL with lat lng and radiusKm', () => {
    service.getCustomerRecommendationSections('customer-1', 19.43, -99.13, 5).subscribe();

    const request = httpTestingController.expectOne(req =>
      req.url === `${environment.apiBaseUrl}/recommendations/customers/customer-1/sections`
      && req.params.get('lat') === '19.43'
      && req.params.get('lng') === '-99.13'
      && req.params.get('radiusKm') === '5'
    );

    expect(request.request.method).toBe('GET');
    request.flush({ nearby: [], alsoOrdered: [], tasteBased: [] });
  });

  it('builds nearest branch URL', () => {
    service.getNearestBranch('restaurant-1', 19.43, -99.13).subscribe();

    const request = httpTestingController.expectOne(req =>
      req.url === `${environment.apiBaseUrl}/recommendations/restaurants/restaurant-1/nearest-branch`
      && req.params.get('lat') === '19.43'
      && req.params.get('lng') === '-99.13'
    );

    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
