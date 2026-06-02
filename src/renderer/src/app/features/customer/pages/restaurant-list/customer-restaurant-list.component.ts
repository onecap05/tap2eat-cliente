import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { CustomerNotificationBellComponent } from '../../components/customer-notification-bell/customer-notification-bell.component';
import { CustomerRestaurantResponse } from '../../models/customer-catalog.models';
import { RecommendationBranchResponse } from '../../models/recommendation.models';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
import { CustomerFavoritesApiService } from '../../services/customer-favorites-api.service';
import { CustomerLocationService } from '../../services/customer-location.service';
import { RecommendationApiService } from '../../services/recommendation-api.service';

const CUSTOMER_RESTAURANT_LIST_TEXT = {
  empty: 'Todavia no hay restaurantes disponibles.',
  searchEmpty: 'No encontramos restaurantes o platillos para esta busqueda.',
  error: 'No pudimos cargar los restaurantes. Intenta de nuevo.',
  viewRestaurant: 'Ver restaurante',
  open: 'Abierto',
  closed: 'Cerrado',
  openNowFilter: 'Abiertos ahora',
  searchPlaceholder: 'Buscar restaurantes o platillos...',
  favoriteAdded: 'Restaurante agregado a favoritos.',
  favoriteRemoved: 'Restaurante quitado de favoritos.',
  favoriteError: 'No pudimos actualizar tus favoritos.'
};

@Component({
  selector: 'app-customer-restaurant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomerNotificationBellComponent],
  templateUrl: './customer-restaurant-list.component.html',
  styleUrl: './customer-restaurant-list.component.css'
})
export class CustomerRestaurantListComponent implements OnInit {
  public readonly text = CUSTOMER_RESTAURANT_LIST_TEXT;

  public restaurants: CustomerRestaurantResponse[] = [];
  public isLoading = true;
  public errorMessage = '';
  public searchTerm = '';
  public activeSearchQuery = '';
  public showOpenOnly = false;
  public nearbyRecommendations: RecommendationBranchResponse[] = [];
  public alsoOrderedRecommendations: RecommendationBranchResponse[] = [];
  public tasteBasedRecommendations: RecommendationBranchResponse[] = [];
  public isLoadingRecommendations = false;
  public favoriteRestaurantIds = new Set<string>();
  public pendingRestaurantFavoriteIds = new Set<string>();
  public favoriteMessage = '';
  public favoriteErrorMessage = '';

  constructor(
    private readonly customerCatalogApiService: CustomerCatalogApiService,
    private readonly recommendationApiService: RecommendationApiService,
    private readonly customerFavoritesApiService: CustomerFavoritesApiService,
    private readonly customerLocationService: CustomerLocationService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  public ngOnInit(): void {
    this.loadRestaurants();
    this.loadRecommendations();
  }

  public get filteredRestaurants(): CustomerRestaurantResponse[] {
    return this.showOpenOnly
      ? this.restaurants.filter(restaurant => restaurant.open)
      : this.restaurants;
  }

  public get emptyStateMessage(): string {
    return this.activeSearchQuery ? this.text.searchEmpty : this.text.empty;
  }

  public getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  public toggleOpenOnly(): void {
    this.showOpenOnly = !this.showOpenOnly;
  }

  public searchRestaurants(): void {
    const query = this.searchTerm.trim();

    if (!query) {
      this.activeSearchQuery = '';
      this.loadRestaurants();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.activeSearchQuery = query;

    this.customerCatalogApiService.searchRestaurants(query).subscribe({
      next: restaurants => {
        this.restaurants = restaurants;
        this.loadRestaurantFavoriteStatus(restaurants);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = this.text.error;
        this.isLoading = false;
      }
    });
  }

  public formatDistance(distanceKm?: number | null): string {
    return distanceKm === null || distanceKm === undefined
      ? ''
      : `A ${distanceKm.toFixed(2)} km`;
  }

  public getRecommendationDistanceLabel(item: RecommendationBranchResponse): string {
    return this.formatDistance(item.distanceKm);
  }

  public hasRecommendationSections(): boolean {
    return this.nearbyRecommendations.length > 0
      || this.alsoOrderedRecommendations.length > 0
      || this.tasteBasedRecommendations.length > 0;
  }

  public trackByRecommendationRestaurantId(
    _index: number,
    recommendation: RecommendationBranchResponse
  ): string {
    return `${recommendation.recommendationType ?? 'RECOMMENDATION'}-${recommendation.restaurantId}`;
  }

  public isRestaurantFavorite(restaurantId: string): boolean {
    return this.favoriteRestaurantIds.has(restaurantId);
  }

  public isRestaurantFavoritePending(restaurantId: string): boolean {
    return this.pendingRestaurantFavoriteIds.has(restaurantId);
  }

  public toggleRestaurantFavorite(event: Event, restaurant: CustomerRestaurantResponse): void {
    event.preventDefault();
    event.stopPropagation();

    const customerAccountId = this.authService.getAccountId();
    if (!customerAccountId || this.pendingRestaurantFavoriteIds.has(restaurant.id)) {
      return;
    }

    this.favoriteMessage = '';
    this.favoriteErrorMessage = '';
    this.pendingRestaurantFavoriteIds.add(restaurant.id);

    const isFavorite = this.favoriteRestaurantIds.has(restaurant.id);
    const request$: Observable<unknown> = isFavorite
      ? this.customerFavoritesApiService.removeRestaurantFavorite(customerAccountId, restaurant.id)
      : this.customerFavoritesApiService.addRestaurantFavorite(customerAccountId, restaurant.id);

    request$.subscribe({
      next: () => {
        if (isFavorite) {
          this.favoriteRestaurantIds.delete(restaurant.id);
          this.favoriteMessage = this.text.favoriteRemoved;
        } else {
          this.favoriteRestaurantIds.add(restaurant.id);
          this.favoriteMessage = this.text.favoriteAdded;
        }

        this.pendingRestaurantFavoriteIds.delete(restaurant.id);
      },
      error: () => {
        this.favoriteErrorMessage = this.text.favoriteError;
        this.pendingRestaurantFavoriteIds.delete(restaurant.id);
      }
    });
  }

  public openRestaurant(restaurantId: string): void {
    void this.router.navigate(['/customer/restaurants', restaurantId]);
  }

  private loadRestaurants(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.customerCatalogApiService.getRestaurants().subscribe({
      next: restaurants => {
        this.restaurants = restaurants;
        this.loadRestaurantFavoriteStatus(restaurants);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = this.text.error;
        this.isLoading = false;
      }
    });
  }

  private loadRecommendations(): void {
    this.isLoadingRecommendations = true;

    this.customerLocationService.getCurrentLocation()
      .pipe(
        switchMap(location => {
          const accountId = this.authService.getAccountId();
          const lat = location?.latitude;
          const lng = location?.longitude;

          return accountId
            ? this.recommendationApiService.getCustomerRecommendationSections(accountId, lat, lng, 5)
            : this.recommendationApiService.getNearbyRecommendations(lat, lng, 5).pipe(
              map(nearby => ({
                nearby,
                alsoOrdered: [],
                tasteBased: []
              }))
            );
        }),
        catchError(() => of({
          nearby: [],
          alsoOrdered: [],
          tasteBased: []
        }))
      )
      .subscribe(sections => {
        this.nearbyRecommendations = sections.nearby ?? [];
        this.alsoOrderedRecommendations = sections.alsoOrdered ?? [];
        this.tasteBasedRecommendations = sections.tasteBased ?? [];
        this.isLoadingRecommendations = false;
      });
  }

  private loadRestaurantFavoriteStatus(restaurants: CustomerRestaurantResponse[]): void {
    const customerAccountId = this.authService.getAccountId();
    const restaurantIds = restaurants.map(restaurant => restaurant.id).filter(Boolean);

    if (!customerAccountId || restaurantIds.length === 0) {
      this.favoriteRestaurantIds = new Set();
      return;
    }

    this.customerFavoritesApiService
      .getCustomerFavoriteStatus(customerAccountId, restaurantIds, [])
      .pipe(catchError(() => of({ restaurantIds: [] as string[], productIds: [] as string[] })))
      .subscribe(status => {
        this.favoriteRestaurantIds = new Set(status.restaurantIds ?? []);
      });
  }
}
