import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { CustomerRestaurantResponse } from '../../models/customer-catalog.models';
import {
  CustomerRecommendationSectionsResponse,
  RecommendationBranchResponse
} from '../../models/recommendation.models';
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
  public sections: CustomerRecommendationSectionsResponse = {
    nearby: [],
    alsoOrdered: [],
    tasteBased: []
  };
  public shouldFail = false;
  public sectionCalls = 0;
  public nearbyCalls = 0;
  public lastCustomerAccountId = '';
  public lastLat?: number;
  public lastLng?: number;
  public lastRadiusKm?: number;

  public getCustomerRecommendationSections(
    customerAccountId: string,
    lat?: number,
    lng?: number,
    radiusKm?: number
  ) {
    this.sectionCalls++;
    this.lastCustomerAccountId = customerAccountId;
    this.lastLat = lat;
    this.lastLng = lng;
    this.lastRadiusKm = radiusKm;

    return this.shouldFail
      ? throwError(() => new Error('recommendation failed'))
      : of(this.sections);
  }

  public getNearbyRecommendations(lat?: number, lng?: number) {
    this.nearbyCalls++;
    this.lastLat = lat;
    this.lastLng = lng;

    return this.shouldFail
      ? throwError(() => new Error('recommendation failed'))
      : of(this.sections.nearby);
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
    recommendationService.sections = {
      nearby: [
        recommendation('restaurant-1', 'Tacos Centro', 'NEARBY')
      ],
      alsoOrdered: [],
      tasteBased: []
    };

    fixture = TestBed.createComponent(CustomerRestaurantListComponent);
    component = fixture.componentInstance;
  });

  it('loads all restaurants as before', () => {
    fixture.detectChanges();

    expect(component.restaurants.length).toBe(2);
    expect(component.filteredRestaurants.length).toBe(2);
  });

  it('calls recommendation sections service with location', () => {
    fixture.detectChanges();

    expect(recommendationService.sectionCalls).toBe(1);
    expect(recommendationService.lastCustomerAccountId).toBe('customer-1');
    expect(recommendationService.lastLat).toBe(19.43);
    expect(recommendationService.lastLng).toBe(-99.13);
    expect(recommendationService.lastRadiusKm).toBe(5);
  });

  it('shows nearby recommendation section when nearby has data', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.textContent).toContain('Restaurantes cerca de ti');
    expect(nativeElement.textContent).toContain('Sucursal Centro');
  });

  it('shows also ordered recommendation section when alsoOrdered has data', () => {
    recommendationService.sections = {
      nearby: [],
      alsoOrdered: [
        recommendation('restaurant-2', 'Pizza Norte', 'ALSO_ORDERED')
      ],
      tasteBased: []
    };

    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.textContent).toContain('Personas con gustos parecidos también pidieron');
    expect(nativeElement.textContent).toContain('Pizza Norte');
  });

  it('shows taste based recommendation section when tasteBased has data', () => {
    recommendationService.sections = {
      nearby: [],
      alsoOrdered: [],
      tasteBased: [
        recommendation('restaurant-1', 'Tacos Centro', 'TASTE_BASED')
      ]
    };

    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.textContent).toContain('Porque sabemos lo que te gusta');
    expect(nativeElement.textContent).toContain('Tacos Centro');
  });

  it('does not show empty recommendation sections', () => {
    recommendationService.sections = {
      nearby: [],
      alsoOrdered: [
        recommendation('restaurant-2', 'Pizza Norte', 'ALSO_ORDERED')
      ],
      tasteBased: []
    };

    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.textContent).not.toContain('Restaurantes cerca de ti');
    expect(nativeElement.textContent).toContain('Personas con gustos parecidos también pidieron');
    expect(nativeElement.textContent).not.toContain('Porque sabemos lo que te gusta');
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
    expect(component.nearbyRecommendations).toEqual([]);
    expect(component.alsoOrderedRecommendations).toEqual([]);
    expect(component.tasteBasedRecommendations).toEqual([]);
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

  it('navigates from recommendation card using recommendation restaurant id', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const recommendationLink = nativeElement.querySelector('.recommendation-card') as HTMLAnchorElement;

    expect(recommendationLink.getAttribute('href')).toContain('/customer/restaurants/restaurant-1');
  });

  it('connects navbar cart and profile actions to protected customer routes', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const cartButton = nativeElement.querySelector('[aria-label="Carrito"]');
    const profileButton = nativeElement.querySelector('[aria-label="Perfil"]');

    expect(cartButton?.getAttribute('routerLink') ?? cartButton?.getAttribute('routerlink')).toBe('/customer/checkout');
    expect(profileButton?.getAttribute('routerLink') ?? profileButton?.getAttribute('routerlink')).toBe('/customer/profile');
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

  function recommendation(
    restaurantId: string,
    restaurantName: string,
    recommendationType: string
  ): RecommendationBranchResponse {
    return {
      restaurantId,
      restaurantName,
      restaurantImageUrl: null,
      branchId: 'branch-1',
      branchName: 'Sucursal Centro',
      branchAddress: 'Centro',
      distanceKm: 2.15,
      reason: 'Cerca de ti',
      score: 100,
      recommendationType
    };
  }
});
