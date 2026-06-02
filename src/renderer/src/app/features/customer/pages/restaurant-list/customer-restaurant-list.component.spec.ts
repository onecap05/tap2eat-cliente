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
import { CustomerFavoritesApiService } from '../../services/customer-favorites-api.service';
import { CustomerNotificationService } from '../../services/customer-notification.service';
import { CustomerLocationService } from '../../services/customer-location.service';
import { RecommendationApiService } from '../../services/recommendation-api.service';
import { CustomerRestaurantListComponent } from './customer-restaurant-list.component';

class FakeCustomerCatalogApiService {
  public restaurants: CustomerRestaurantResponse[] = [];
  public searchResults: CustomerRestaurantResponse[] = [];
  public getRestaurantCalls = 0;
  public searchCalls = 0;
  public lastSearchQuery = '';

  public getRestaurants() {
    this.getRestaurantCalls++;
    return of(this.restaurants);
  }

  public searchRestaurants(query: string) {
    this.searchCalls++;
    this.lastSearchQuery = query;

    return of(this.searchResults);
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

class FakeCustomerFavoritesApiService {
  public favoriteRestaurantIds: string[] = [];
  public statusCalls = 0;
  public addRestaurantCalls = 0;
  public removeRestaurantCalls = 0;
  public shouldFail = false;

  public getCustomerFavoriteStatus() {
    this.statusCalls++;

    return of({
      restaurantIds: this.favoriteRestaurantIds,
      productIds: []
    });
  }

  public addRestaurantFavorite() {
    this.addRestaurantCalls++;

    return this.shouldFail
      ? throwError(() => new Error('favorite failed'))
      : of({ restaurantId: 'restaurant-1' });
  }

  public removeRestaurantFavorite() {
    this.removeRestaurantCalls++;

    return this.shouldFail
      ? throwError(() => new Error('favorite failed'))
      : of(null);
  }
}

class FakeAuthService {
  public accountId: string | null = 'customer-1';

  public getAccountId(): string | null {
    return this.accountId;
  }
}

class FakeCustomerNotificationService {
  public notifications$ = of([]);
  public unreadCount$ = of(0);
  public toast$ = of(null);

  public initializeForCurrentCustomer(): void {}
  public markAsRead(): void {}
  public markAllAsRead(): void {}
  public clearToast(): void {}
}

describe('CustomerRestaurantListComponent', () => {
  let fixture: ComponentFixture<CustomerRestaurantListComponent>;
  let component: CustomerRestaurantListComponent;
  let catalogService: FakeCustomerCatalogApiService;
  let recommendationService: FakeRecommendationApiService;
  let favoritesService: FakeCustomerFavoritesApiService;
  let locationService: FakeCustomerLocationService;
  let authService: FakeAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerRestaurantListComponent],
      providers: [
        provideRouter([]),
        { provide: CustomerCatalogApiService, useClass: FakeCustomerCatalogApiService },
        { provide: RecommendationApiService, useClass: FakeRecommendationApiService },
        { provide: CustomerFavoritesApiService, useClass: FakeCustomerFavoritesApiService },
        { provide: CustomerLocationService, useClass: FakeCustomerLocationService },
        { provide: AuthService, useClass: FakeAuthService },
        { provide: CustomerNotificationService, useClass: FakeCustomerNotificationService }
      ]
    }).compileComponents();

    catalogService = TestBed.inject(CustomerCatalogApiService) as unknown as FakeCustomerCatalogApiService;
    recommendationService = TestBed.inject(RecommendationApiService) as unknown as FakeRecommendationApiService;
    favoritesService = TestBed.inject(CustomerFavoritesApiService) as unknown as FakeCustomerFavoritesApiService;
    locationService = TestBed.inject(CustomerLocationService) as unknown as FakeCustomerLocationService;
    authService = TestBed.inject(AuthService) as unknown as FakeAuthService;

    catalogService.restaurants = [
      restaurant('restaurant-1', 'Tacos Centro', true),
      restaurant('restaurant-2', 'Pizza Norte', false)
    ];
    catalogService.searchResults = [
      restaurant('restaurant-3', 'Postres Sur', true)
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
    expect(favoritesService.statusCalls).toBe(1);
  });

  it('renders visual food type filters', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;

    expect(nativeElement.textContent).toContain('Tipos de comida');
    expect(nativeElement.textContent).toContain('Hamburguesas');
    expect(nativeElement.textContent).toContain('Pizza');
    expect(nativeElement.textContent).toContain('Tacos');
    expect(nativeElement.querySelectorAll('.food-type-chip').length).toBe(component.foodTypes.length);
  });

  it('selects food type and searches with its query', () => {
    fixture.detectChanges();

    component.selectFoodType(component.foodTypes.find(type => type.query === 'tacos')!);
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const tacosChip = Array.from(nativeElement.querySelectorAll('.food-type-chip')) as HTMLButtonElement[];
    const activeTacosChip = tacosChip
      .find((chip): chip is HTMLButtonElement => chip.textContent?.includes('Tacos') ?? false);

    expect(component.selectedFoodTypeQuery).toBe('tacos');
    expect(catalogService.searchCalls).toBe(1);
    expect(catalogService.lastSearchQuery).toBe('tacos');
    expect(activeTacosChip?.classList.contains('active')).toBe(true);
  });

  it('combines typed search with selected food type', () => {
    fixture.detectChanges();

    component.searchTerm = 'centro';
    component.selectFoodType(component.foodTypes.find(type => type.query === 'pizza')!);

    expect(catalogService.lastSearchQuery).toBe('centro pizza');
    expect(component.activeSearchQuery).toBe('centro pizza');
  });

  it('clears food type and reloads all restaurants when Todos is selected', () => {
    fixture.detectChanges();

    component.searchTerm = 'centro';
    component.selectFoodType(component.foodTypes.find(type => type.query === 'tacos')!);
    component.selectFoodType(component.foodTypes[0]);

    expect(component.selectedFoodTypeQuery).toBe('');
    expect(component.searchTerm).toBe('');
    expect(component.activeSearchQuery).toBe('');
    expect(catalogService.getRestaurantCalls).toBe(2);
  });

  it('marks favorite restaurants from status response', () => {
    favoritesService.favoriteRestaurantIds = ['restaurant-1'];

    fixture.detectChanges();

    expect(component.isRestaurantFavorite('restaurant-1')).toBe(true);
    expect(component.isRestaurantFavorite('restaurant-2')).toBe(false);
  });

  it('toggles restaurant favorite without navigating', () => {
    fixture.detectChanges();

    component.toggleRestaurantFavorite(new MouseEvent('click'), catalogService.restaurants[0]);

    expect(favoritesService.addRestaurantCalls).toBe(1);
    expect(component.isRestaurantFavorite('restaurant-1')).toBe(true);
    expect(component.favoriteMessage).toContain('agregado');
  });

  it('removes restaurant favorite when already active', () => {
    favoritesService.favoriteRestaurantIds = ['restaurant-1'];
    fixture.detectChanges();

    component.toggleRestaurantFavorite(new MouseEvent('click'), catalogService.restaurants[0]);

    expect(favoritesService.removeRestaurantCalls).toBe(1);
    expect(component.isRestaurantFavorite('restaurant-1')).toBe(false);
  });

  it('shows friendly error when favorite api fails', () => {
    favoritesService.shouldFail = true;
    fixture.detectChanges();

    component.toggleRestaurantFavorite(new MouseEvent('click'), catalogService.restaurants[0]);

    expect(component.favoriteErrorMessage).toContain('No pudimos');
  });

  it('does not send duplicate favorite requests while pending', () => {
    fixture.detectChanges();
    component.pendingRestaurantFavoriteIds.add('restaurant-1');

    component.toggleRestaurantFavorite(new MouseEvent('click'), catalogService.restaurants[0]);

    expect(favoritesService.addRestaurantCalls).toBe(0);
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

  it('searches restaurants when search button is clicked', () => {
    fixture.detectChanges();

    component.searchTerm = 'postre';
    fixture.nativeElement.querySelector('.search-box button').click();

    expect(catalogService.searchCalls).toBe(1);
    expect(catalogService.lastSearchQuery).toBe('postre');
    expect(component.restaurants.map(item => item.id)).toEqual(['restaurant-3']);
  });

  it('searches restaurants when Enter is pressed', () => {
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('.search-box input') as HTMLInputElement;
    input.value = 'tacos';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(catalogService.searchCalls).toBe(1);
    expect(catalogService.lastSearchQuery).toBe('tacos');
  });

  it('reloads all restaurants when search query is blank', () => {
    fixture.detectChanges();

    component.searchTerm = '   ';
    component.activeSearchQuery = 'tacos';
    component.searchRestaurants();

    expect(catalogService.searchCalls).toBe(0);
    expect(catalogService.getRestaurantCalls).toBe(2);
    expect(component.activeSearchQuery).toBe('');
  });

  it('shows search empty state when search has no results', () => {
    catalogService.searchResults = [];
    fixture.detectChanges();

    component.searchTerm = 'ramen';
    component.searchRestaurants();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No encontramos restaurantes o platillos para esta busqueda.');
  });

  it('shows food type empty state when type has no results', () => {
    catalogService.searchResults = [];
    fixture.detectChanges();

    component.selectFoodType(component.foodTypes.find(type => type.query === 'sushi')!);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No encontramos restaurantes o platillos para este tipo de comida.');
  });

  it('keeps open filter over the current restaurant list', () => {
    fixture.detectChanges();

    component.toggleOpenOnly();
    expect(component.filteredRestaurants.map(item => item.id)).toEqual(['restaurant-1']);
  });

  it('keeps open filter over food type search results', () => {
    catalogService.searchResults = [
      restaurant('restaurant-3', 'Tacos Sur', true),
      restaurant('restaurant-4', 'Tacos Noche', false)
    ];
    fixture.detectChanges();

    component.selectFoodType(component.foodTypes.find(type => type.query === 'tacos')!);
    component.toggleOpenOnly();

    expect(component.filteredRestaurants.map(item => item.id)).toEqual(['restaurant-3']);
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
