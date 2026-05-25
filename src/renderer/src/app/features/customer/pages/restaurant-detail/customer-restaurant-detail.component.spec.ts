import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ICartState } from '../../models/cart.models';
import {
  CustomerBranchResponse,
  CustomerCategoryResponse,
  CustomerProductResponse,
  CustomerRestaurantResponse
} from '../../models/customer-catalog.models';
import { RecommendationBranchResponse } from '../../models/recommendation.models';
import { CartService } from '../../services/cart.service';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
import { CustomerLocationService } from '../../services/customer-location.service';
import { RecommendationApiService } from '../../services/recommendation-api.service';
import { CustomerRestaurantDetailComponent } from './customer-restaurant-detail.component';

function restaurant(): CustomerRestaurantResponse {
  return {
    id: 'restaurant-1',
    name: 'Tacos Centro',
    description: 'Tacos',
    logo: null,
    active: true,
    open: true
  } as CustomerRestaurantResponse;
}

function branch(id: string, open: boolean, isMainBranch: boolean): CustomerBranchResponse {
  return {
    id,
    restaurantId: 'restaurant-1',
    name: id === 'branch-main' ? 'Centro' : 'Norte',
    formattedAddress: `${id} address`,
    latitude: 19.43,
    longitude: -99.13,
    isMainBranch,
    active: true,
    open
  } as CustomerBranchResponse;
}

function recommendation(branchId: string): RecommendationBranchResponse {
  return {
    restaurantId: 'restaurant-1',
    restaurantName: 'Tacos Centro',
    branchId,
    branchName: branchId === 'branch-main' ? 'Centro' : 'Norte',
    branchAddress: `${branchId} address`,
    distanceKm: 1.2,
    reason: 'Cerca de ti',
    score: 100
  };
}

function product(id: string): CustomerProductResponse {
  return {
    id,
    restaurantId: 'restaurant-1',
    categoryId: 'category-1',
    name: 'Taco',
    description: 'Taco',
    productType: 'SIMPLE',
    price: 50,
    image: null,
    displayOrder: 1,
    featured: false,
    availability: null,
    active: true,
    available: true,
    tags: [],
    dietaryFlags: [],
    allergens: [],
    modifierGroups: []
  } as CustomerProductResponse;
}

class FakeCustomerCatalogApiService {
  public restaurant = restaurant();
  public branches: CustomerBranchResponse[] = [
    branch('branch-main', true, true),
    branch('branch-near', true, false)
  ];
  public categories: CustomerCategoryResponse[] = [];
  public products: CustomerProductResponse[] = [];

  public getRestaurant() {
    return of(this.restaurant);
  }

  public getBranches() {
    return of(this.branches);
  }

  public getCategories() {
    return of(this.categories);
  }

  public getProducts() {
    return of(this.products);
  }

  public getProduct(productId: string) {
    return of(this.products.find(product => product.id === productId) ?? product(productId));
  }
}

class FakeRecommendationApiService {
  public nearestBranch: RecommendationBranchResponse | null = recommendation('branch-near');
  public shouldFail = false;

  public getNearestBranch() {
    return this.shouldFail
      ? throwError(() => new Error('recommendation failed'))
      : of(this.nearestBranch);
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

class FakeCartService {
  public state$ = new Subject<ICartState>();
  public lastBranchId: string | null | undefined;
  private readonly state: ICartState = {
    restaurantId: 'restaurant-1',
    branchId: null,
    items: [],
    subtotal: 0
  };

  public getSnapshot(): ICartState {
    return this.state;
  }

  public addItem(request: { branchId?: string | null }): boolean {
    this.lastBranchId = request.branchId;
    return true;
  }

  public increaseItem(): void {}

  public decreaseItem(): void {}

  public removeItem(): void {}
}

describe('CustomerRestaurantDetailComponent', () => {
  let fixture: ComponentFixture<CustomerRestaurantDetailComponent>;
  let component: CustomerRestaurantDetailComponent;
  let recommendationService: FakeRecommendationApiService;
  let catalogService: FakeCustomerCatalogApiService;
  let cartService: FakeCartService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerRestaurantDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'restaurant-1'
              }
            }
          }
        },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: CustomerCatalogApiService, useClass: FakeCustomerCatalogApiService },
        { provide: RecommendationApiService, useClass: FakeRecommendationApiService },
        { provide: CustomerLocationService, useClass: FakeCustomerLocationService },
        { provide: CartService, useClass: FakeCartService }
      ]
    }).compileComponents();

    recommendationService = TestBed.inject(RecommendationApiService) as unknown as FakeRecommendationApiService;
    catalogService = TestBed.inject(CustomerCatalogApiService) as unknown as FakeCustomerCatalogApiService;
    cartService = TestBed.inject(CartService) as unknown as FakeCartService;

    fixture = TestBed.createComponent(CustomerRestaurantDetailComponent);
    component = fixture.componentInstance;
  });

  it('selects nearest branch when recommendation responds with branchId', () => {
    fixture.detectChanges();

    expect(component.selectedBranchId).toBe('branch-near');
    expect(component.recommendedBranch?.branchId).toBe('branch-near');
  });

  it('uses fallback and shows warning when backend returns warning without location', () => {
    recommendationService.nearestBranch = {
      ...recommendation('branch-main'),
      warning: 'No pudimos acceder a tu ubicación. Seleccionamos una sucursal disponible automáticamente, pero puedes cambiarla antes de ordenar.'
    };

    fixture.detectChanges();

    expect(component.selectedBranchId).toBe('branch-main');
    expect(component.recommendationWarning).toContain('No pudimos acceder');
  });

  it('shows branch list when change branch is clicked', () => {
    fixture.detectChanges();

    component.showBranchesForChange();

    expect(component.showBranchList).toBe(true);
  });

  it('updates selectedBranchId when selecting an open branch', () => {
    fixture.detectChanges();

    component.showBranchesForChange();
    component.selectBranch(catalogService.branches[0]);

    expect(component.selectedBranchId).toBe('branch-main');
    expect(component.showBranchList).toBe(false);
  });

  it('uses default branch when recommendation fails', () => {
    recommendationService.shouldFail = true;

    fixture.detectChanges();

    expect(component.selectedBranchId).toBe('branch-main');
    expect(component.recommendedBranch?.branchId).toBe('branch-main');
  });

  it('cart uses selectedBranchId', () => {
    catalogService.products = [product('product-1')];
    fixture.detectChanges();

    component.selectedProduct = catalogService.products[0];
    component.addSelectedProductToCart();

    expect(cartService.lastBranchId).toBe('branch-near');
  });

  it('connects navbar cart and profile actions to protected customer routes', () => {
    fixture.detectChanges();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const cartButton = nativeElement.querySelector('[aria-label="Carrito"]');
    const profileButton = nativeElement.querySelector('[aria-label="Perfil"]');

    expect(cartButton?.getAttribute('routerLink') ?? cartButton?.getAttribute('routerlink')).toBe('/customer/checkout');
    expect(profileButton?.getAttribute('routerLink') ?? profileButton?.getAttribute('routerlink')).toBe('/customer/profile');
  });

});
