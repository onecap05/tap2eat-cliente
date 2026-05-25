import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { CustomerRestaurantResponse } from '../../models/customer-catalog.models';
import { RecommendationBranchResponse } from '../../models/recommendation.models';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';
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
  searchPlaceholder: 'Buscar restaurantes o platillos...'
};

@Component({
  selector: 'app-customer-restaurant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

  constructor(
    private readonly customerCatalogApiService: CustomerCatalogApiService,
    private readonly recommendationApiService: RecommendationApiService,
    private readonly customerLocationService: CustomerLocationService,
    private readonly authService: AuthService
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

  private loadRestaurants(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.customerCatalogApiService.getRestaurants().subscribe({
      next: restaurants => {
        this.restaurants = restaurants;
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
}
