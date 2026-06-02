import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../../services/auth.service';
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
import { CustomerFavoritesApiService } from '../../services/customer-favorites-api.service';
import { CustomerNotificationService } from '../../services/customer-notification.service';
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

class FakeAuthService {
  public accountId: string | null = 'customer-1';

  public getAccountId(): string | null {
    return this.accountId;
  }
}

class FakeCustomerFavoritesApiService {
  public favoriteRestaurantIds: string[] = [];
  public favoriteProductIds: string[] = [];
  public featuredProduct: unknown = null;
  public addRestaurantCalls = 0;
  public addProductCalls = 0;
  public lastProductId = '';
  public shouldFail = false;

  public getCustomerFavoriteStatus() {
    return of({
      restaurantIds: this.favoriteRestaurantIds,
      productIds: this.favoriteProductIds
    });
  }

  public getFeaturedProduct() {
    return this.featuredProduct
      ? of(this.featuredProduct)
      : throwError(() => new Error('not found'));
  }

  public addRestaurantFavorite() {
    this.addRestaurantCalls++;

    return this.shouldFail
      ? throwError(() => new Error('favorite failed'))
      : of({ restaurantId: 'restaurant-1' });
  }

  public removeRestaurantFavorite() {
    return of(null);
  }

  public addProductFavorite(_customerAccountId: string, productId: string) {
    this.addProductCalls++;
    this.lastProductId = productId;

    return this.shouldFail
      ? throwError(() => new Error('favorite failed'))
      : of({ productId });
  }

  public removeProductFavorite() {
    return of(null);
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

describe('CustomerRestaurantDetailComponent', () => {
  let fixture: ComponentFixture<CustomerRestaurantDetailComponent>;
  let component: CustomerRestaurantDetailComponent;
  let recommendationService: FakeRecommendationApiService;
  let favoritesService: FakeCustomerFavoritesApiService;
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
        { provide: CustomerFavoritesApiService, useClass: FakeCustomerFavoritesApiService },
        { provide: CustomerLocationService, useClass: FakeCustomerLocationService },
        { provide: CartService, useClass: FakeCartService },
        { provide: AuthService, useClass: FakeAuthService },
        { provide: CustomerNotificationService, useClass: FakeCustomerNotificationService }
      ]
    }).compileComponents();

    recommendationService = TestBed.inject(RecommendationApiService) as unknown as FakeRecommendationApiService;
    favoritesService = TestBed.inject(CustomerFavoritesApiService) as unknown as FakeCustomerFavoritesApiService;
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

  it('loads favorite status for restaurant and products', () => {
    catalogService.products = [product('product-1')];
    favoritesService.favoriteRestaurantIds = ['restaurant-1'];
    favoritesService.favoriteProductIds = ['product-1'];

    fixture.detectChanges();

    expect(component.restaurantIsFavorite).toBe(true);
    expect(component.isProductFavorite('product-1')).toBe(true);
  });

  it('toggles restaurant favorite', () => {
    fixture.detectChanges();

    component.toggleRestaurantFavorite(new MouseEvent('click'));

    expect(favoritesService.addRestaurantCalls).toBe(1);
    expect(component.restaurantIsFavorite).toBe(true);
  });

  it('toggles product favorite with only base product id', () => {
    catalogService.products = [product('product-1')];
    fixture.detectChanges();

    component.selectedProduct = catalogService.products[0];
    component.selectedOptionsByGroup.set('group-1', [
      { id: 'option-1', name: 'Extra queso', additionalPrice: 10, active: true } as never
    ]);
    component.toggleProductFavorite(new MouseEvent('click'), catalogService.products[0]);

    expect(favoritesService.addProductCalls).toBe(1);
    expect(favoritesService.lastProductId).toBe('product-1');
    expect(component.isProductFavorite('product-1')).toBe(true);
  });

  it('shows featured product when it exists', () => {
    favoritesService.featuredProduct = {
      productId: 'product-1',
      productName: 'Taco favorito',
      restaurantId: 'restaurant-1',
      price: 50,
      favoriteCount: 2
    };

    fixture.detectChanges();

    expect(component.featuredProduct?.productId).toBe('product-1');
    expect(fixture.nativeElement.textContent).toContain('Producto destacado');
  });

  it('does not show featured product when api returns not found', () => {
    fixture.detectChanges();

    expect(component.featuredProduct).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Producto destacado');
  });

  it('shows friendly error when favorite api fails', () => {
    favoritesService.shouldFail = true;
    fixture.detectChanges();

    component.toggleRestaurantFavorite(new MouseEvent('click'));

    expect(component.favoriteErrorMessage).toContain('No pudimos');
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
