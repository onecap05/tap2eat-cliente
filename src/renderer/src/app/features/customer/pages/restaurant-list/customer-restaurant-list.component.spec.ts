import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { CustomerRestaurantResponse } from '../../models/customer-catalog.models';
import { RecommendationBranchResponse } from '../../models/recommendation.models';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
import { CustomerLocationService } from '../../services/customer-location.service';
import { RecommendationApiService } from '../../services/recommendation-api.service';
import { CustomerRestaurantListComponent } from './customer-restaurant-list.component';

class FakeCustomerCatalogApiService {
  public restaurants: CustomerRestaurantResponse[] = [];

  public getRestaurants() {
    return of(this.restaurants);
  }
}

class FakeRecommendationApiService {
  public recommendations: RecommendationBranchResponse[] = [];
  public shouldFail = false;
  public customerCalls = 0;
  public nearbyCalls = 0;
  public lastCustomerAccountId = '';
  public lastLat?: number;
  public lastLng?: number;

  public getCustomerRecommendations(customerAccountId: string, lat?: number, lng?: number) {
    this.customerCalls++;
    this.lastCustomerAccountId = customerAccountId;
    this.lastLat = lat;
    this.lastLng = lng;

    return this.shouldFail
      ? throwError(() => new Error('recommendation failed'))
      : of(this.recommendations);
  }

  public getNearbyRecommendations(lat?: number, lng?: number) {
    this.nearbyCalls++;
    this.lastLat = lat;
    this.lastLng = lng;

    return this.shouldFail
      ? throwError(() => new Error('recommendation failed'))
      : of(this.recommendations);
  }
}

class FakeCustomerLocationService {
  public location: { latitude: number; longitude: number } | null = {
    latitude: 19.43,
    longitude: -99.13
  };

  public getCurrentLocation() {
    return of(this.location);
  }
}

class FakeAuthService {
  public accountId: string | null = 'customer-1';

  public getAccountId(): string | null {
    return this.accountId;
  }
}

describe('CustomerRestaurantListComponent', () => {
  let fixture: ComponentFixture<CustomerRestaurantListComponent>;
  let component: CustomerRestaurantListComponent;
  let catalogService: FakeCustomerCatalogApiService;
  let recommendationService: FakeRecommendationApiService;
  let locationService: FakeCustomerLocationService;
  let authService: FakeAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerRestaurantListComponent],
      providers: [
        provideRouter([]),
        { provide: CustomerCatalogApiService, useClass: FakeCustomerCatalogApiService },
        { provide: RecommendationApiService, useClass: FakeRecommendationApiService },
        { provide: CustomerLocationService, useClass: FakeCustomerLocationService },
        { provide: AuthService, useClass: FakeAuthService }
      ]
    }).compileComponents();

    catalogService = TestBed.inject(CustomerCatalogApiService) as unknown as FakeCustomerCatalogApiService;
    recommendationService = TestBed.inject(RecommendationApiService) as unknown as FakeRecommendationApiService;
    locationService = TestBed.inject(CustomerLocationService) as unknown as FakeCustomerLocationService;
    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;

    catalogService.restaurants = [
      restaurant('restaurant-1', 'Tacos Centro', true),
      restaurant('restaurant-2', 'Pizza Norte', false)
    ];
    recommendationService.recommendations = [
      recommendation('restaurant-1', 'Tacos Centro')
    ];

    fixture = TestBed.createComponent(CustomerRestaurantListComponent);
    component = fixture.componentInstance;
  });

  it('loads all restaurants as before', () => {
    fixture.detectChanges();

    expect(component.restaurants.length).toBe(2);
    expect(component.filteredRestaurants.length).toBe(2);
  });

  it('calls recommendation service with location', () => {
    fixture.detectChanges();

    expect(recommendationService.customerCalls).toBe(1);
    expect(recommendationService.lastCustomerAccountId).toBe('customer-1');
    expect(recommendationService.lastLat).toBe(19.43);
    expect(recommendationService.lastLng).toBe(-99.13);
  });

  it('shows recommendations when available', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.textContent).toContain('Recomendado para ti');
    expect(nativeElement.textContent).toContain('Sucursal Centro');
  });

  it('keeps showing all restaurants even when recommendations exist', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.textContent).toContain('Restaurantes disponibles');
    expect(nativeElement.textContent).toContain('Tacos Centro');
    expect(nativeElement.textContent).toContain('Pizza Norte');
  });

  it('does not fail when location is null', () => {
    locationService.location = null;

    fixture.detectChanges();

    expect(component.restaurants.length).toBe(2);
    expect(recommendationService.lastLat).toBeUndefined();
    expect(recommendationService.lastLng).toBeUndefined();
  });

  it('does not fail when recommendations request fails', () => {
    recommendationService.shouldFail = true;

    fixture.detectChanges();

    expect(component.restaurants.length).toBe(2);
    expect(component.recommendations).toEqual([]);
  });

  it('uses nearby recommendations when customer account id is missing', () => {
    authService.accountId = null;

    fixture.detectChanges();

    expect(recommendationService.nearbyCalls).toBe(1);
  });

  it('keeps search and open filters over the full restaurant list', () => {
    fixture.detectChanges();

    component.searchTerm = 'pizza';
    expect(component.filteredRestaurants.map(item => item.id)).toEqual(['restaurant-2']);

    component.searchTerm = '';
    component.toggleOpenOnly();
    expect(component.filteredRestaurants.map(item => item.id)).toEqual(['restaurant-1']);
  });

  function restaurant(id: string, name: string, open: boolean): CustomerRestaurantResponse {
    return {
      id,
      name,
      description: `${name} description`,
      logo: null,
      active: true,
      open
    } as CustomerRestaurantResponse;
  }

  function recommendation(restaurantId: string, restaurantName: string): RecommendationBranchResponse {
    return {
      restaurantId,
      restaurantName,
      restaurantImageUrl: null,
      branchId: 'branch-1',
      branchName: 'Sucursal Centro',
      branchAddress: 'Centro',
      distanceKm: 2.15,
      reason: 'Cerca de ti',
      score: 100
    };
  }
});
