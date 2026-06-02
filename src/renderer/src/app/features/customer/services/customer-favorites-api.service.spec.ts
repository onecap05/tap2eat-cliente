import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { CustomerFavoritesApiService } from './customer-favorites-api.service';

describe('CustomerFavoritesApiService', () => {
  let service: CustomerFavoritesApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CustomerFavoritesApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CustomerFavoritesApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should add a restaurant favorite with customer account id', () => {
    service.addRestaurantFavorite('customer-1', 'restaurant-1').subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/favorites/restaurants/restaurant-1?customerAccountId=customer-1`
    );

    expect(request.request.method).toBe('POST');
    request.flush({ restaurantId: 'restaurant-1' });
  });

  it('should remove a product favorite with customer account id', () => {
    service.removeProductFavorite('customer-1', 'product-1').subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/favorites/products/product-1?customerAccountId=customer-1`
    );

    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('should request favorite status with repeated restaurant and product ids', () => {
    service
      .getCustomerFavoriteStatus('customer-1', ['restaurant-1', 'restaurant-2'], ['product-1'])
      .subscribe();

    const request = httpTestingController.expectOne(
      item => item.url === `${environment.apiBaseUrl}/favorites/customers/customer-1/status`
    );

    expect(request.request.params.getAll('restaurantIds')).toEqual(['restaurant-1', 'restaurant-2']);
    expect(request.request.params.getAll('productIds')).toEqual(['product-1']);
    request.flush({ restaurantIds: ['restaurant-1'], productIds: ['product-1'] });
  });

  it('should request featured product by restaurant', () => {
    service.getFeaturedProduct('restaurant-1').subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiBaseUrl}/favorites/restaurants/restaurant-1/featured-product`
    );

    expect(request.request.method).toBe('GET');
    request.flush({ productId: 'product-1' });
  });
});
