import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { CustomerCatalogApiService } from './customer-catalog-api.service';

describe('CustomerCatalogApiService', () => {
  let service: CustomerCatalogApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CustomerCatalogApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should request public customer restaurants', () => {
    service.getRestaurants().subscribe(restaurants => {
      expect(restaurants).toEqual([]);
    });

    const request = httpTestingController.expectOne(`${environment.catalogApiUrl}/customer/restaurants`);

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should search public customer restaurants', () => {
    service.searchRestaurants('tacos al pastor').subscribe(restaurants => {
      expect(restaurants).toEqual([]);
    });

    const request = httpTestingController.expectOne(
      `${environment.catalogApiUrl}/customer/restaurants/search?query=tacos%20al%20pastor`
    );

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should request public customer products by restaurant', () => {
    service.getProducts('restaurant-1').subscribe(products => {
      expect(products).toEqual([]);
    });

    const request = httpTestingController.expectOne(
      `${environment.catalogApiUrl}/customer/restaurants/restaurant-1/products`
    );

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
