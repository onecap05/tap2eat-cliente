import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IRestaurantResponse } from '../../../catalog/models/restaurant/IRestaurantResponse';
import { CustomerCatalogApiService } from '../../services/customer-catalog-api.service';

const CUSTOMER_RESTAURANT_LIST_TEXT = {
  empty: 'Todavía no hay restaurantes disponibles.',
  error: 'No pudimos cargar los restaurantes. Intenta de nuevo.',
  viewRestaurant: 'Ver restaurante',
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

  public restaurants: IRestaurantResponse[] = [];
  public isLoading = true;
  public errorMessage = '';
  public searchTerm = '';

  constructor(private readonly customerCatalogApiService: CustomerCatalogApiService) {}

  public ngOnInit(): void {
    this.loadRestaurants();
  }

  public get filteredRestaurants(): IRestaurantResponse[] {
    const normalizedSearchTerm = this.searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return this.restaurants;
    }

    return this.restaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(normalizedSearchTerm)
      || (restaurant.description ?? '').toLowerCase().includes(normalizedSearchTerm)
    );
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
}