import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../services/auth.service';
import { CustomerNotificationBellComponent } from '../../components/customer-notification-bell/customer-notification-bell.component';
import {
  FavoriteProductResponse,
  FavoriteRestaurantResponse
} from '../../models/favorite.models';
import { CustomerFavoritesApiService } from '../../services/customer-favorites-api.service';

const CUSTOMER_FAVORITES_TEXT = {
  loading: 'Cargando favoritos...',
  error: 'No pudimos cargar tus favoritos.',
  empty: 'Aun no tienes favoritos. Marca restaurantes o productos con el corazon para verlos aqui.',
  restaurants: 'Restaurantes favoritos',
  products: 'Productos favoritos',
  openRestaurant: 'Ver restaurante'
};

@Component({
  selector: 'app-customer-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerNotificationBellComponent],
  templateUrl: './customer-favorites.component.html',
  styleUrl: './customer-favorites.component.css'
})
export class CustomerFavoritesComponent implements OnInit {
  public readonly text = CUSTOMER_FAVORITES_TEXT;
  public restaurants: FavoriteRestaurantResponse[] = [];
  public products: FavoriteProductResponse[] = [];
  public isLoading = true;
  public errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly customerFavoritesApiService: CustomerFavoritesApiService,
    private readonly router: Router
  ) {}

  public ngOnInit(): void {
    const customerAccountId = this.authService.getAccountId();

    if (!customerAccountId) {
      this.errorMessage = this.text.error;
      this.isLoading = false;
      return;
    }

    this.customerFavoritesApiService.getCustomerFavorites(customerAccountId).subscribe({
      next: response => {
        this.restaurants = response.restaurants ?? [];
        this.products = response.products ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = this.text.error;
        this.isLoading = false;
      }
    });
  }

  public get hasFavorites(): boolean {
    return this.restaurants.length > 0 || this.products.length > 0;
  }

  public openRestaurant(restaurantId: string): void {
    void this.router.navigate(['/customer/restaurants', restaurantId]);
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }
}
