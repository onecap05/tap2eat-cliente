import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../../services/auth.service';
import { CustomerNotificationService } from '../../services/customer-notification.service';
import { CustomerFavoritesApiService } from '../../services/customer-favorites-api.service';
import { CustomerFavoritesComponent } from './customer-favorites.component';

class FakeAuthService {
  public accountId: string | null = 'customer-1';

  public getAccountId(): string | null {
    return this.accountId;
  }
}

class FakeCustomerFavoritesApiService {
  public shouldFail = false;
  public response = {
    restaurants: [
      {
        restaurantId: 'restaurant-1',
        restaurantName: 'Tacos Centro',
        restaurantImageUrl: null,
        available: true,
        createdAt: '2026-06-01T00:00:00Z'
      }
    ],
    products: [
      {
        productId: 'product-1',
        productName: 'Taco base',
        restaurantId: 'restaurant-1',
        restaurantName: 'Tacos Centro',
        productImageUrl: null,
        price: 50,
        available: true,
        createdAt: '2026-06-01T00:00:00Z'
      }
    ]
  };

  public getCustomerFavorites() {
    return this.shouldFail
      ? throwError(() => new Error('favorites failed'))
      : of(this.response);
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

describe('CustomerFavoritesComponent', () => {
  let fixture: ComponentFixture<CustomerFavoritesComponent>;
  let component: CustomerFavoritesComponent;
  let favoritesService: FakeCustomerFavoritesApiService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerFavoritesComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useClass: FakeAuthService },
        { provide: CustomerFavoritesApiService, useClass: FakeCustomerFavoritesApiService },
        { provide: CustomerNotificationService, useClass: FakeCustomerNotificationService }
      ]
    }).compileComponents();

    favoritesService = TestBed.inject(CustomerFavoritesApiService) as unknown as FakeCustomerFavoritesApiService;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CustomerFavoritesComponent);
    component = fixture.componentInstance;
  });

  it('shows favorite restaurants and products', () => {
    fixture.detectChanges();

    expect(component.restaurants).toHaveLength(1);
    expect(component.products).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Tacos Centro');
    expect(fixture.nativeElement.textContent).toContain('Taco base');
  });

  it('shows empty state when customer has no favorites', () => {
    favoritesService.response = { restaurants: [], products: [] };

    fixture.detectChanges();

    expect(component.hasFavorites).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Aun no tienes favoritos');
  });

  it('shows friendly error when api fails', () => {
    favoritesService.shouldFail = true;

    fixture.detectChanges();

    expect(component.errorMessage).toContain('No pudimos');
  });

  it('navigates from product favorite to restaurant detail', () => {
    fixture.detectChanges();

    component.openRestaurant('restaurant-1');

    expect(router.navigate).toHaveBeenCalledWith(['/customer/restaurants', 'restaurant-1']);
  });
});
