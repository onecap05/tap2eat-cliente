import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CustomerBranchResponse,
  CustomerCategoryResponse,
  CustomerProductResponse,
  CustomerRestaurantResponse
} from '../models/customer-catalog.models';

@Injectable({
  providedIn: 'root'
})
export class CustomerCatalogApiService {
  private readonly baseUrl = `${environment.catalogApiUrl}/customer`;

  constructor(private readonly http: HttpClient) {}

  public getRestaurants(): Observable<CustomerRestaurantResponse[]> {
    return this.http.get<CustomerRestaurantResponse[]>(`${this.baseUrl}/restaurants`);
  }

  public getRestaurant(restaurantId: string): Observable<CustomerRestaurantResponse> {
    return this.http.get<CustomerRestaurantResponse>(`${this.baseUrl}/restaurants/${restaurantId}`);
  }

  public getBranches(restaurantId: string): Observable<CustomerBranchResponse[]> {
    return this.http.get<CustomerBranchResponse[]>(`${this.baseUrl}/restaurants/${restaurantId}/branches`);
  }

  public getCategories(restaurantId: string): Observable<CustomerCategoryResponse[]> {
    return this.http.get<CustomerCategoryResponse[]>(`${this.baseUrl}/restaurants/${restaurantId}/categories`);
  }

  public getProducts(restaurantId: string): Observable<CustomerProductResponse[]> {
    return this.http.get<CustomerProductResponse[]>(`${this.baseUrl}/restaurants/${restaurantId}/products`);
  }

  public getProduct(productId: string): Observable<CustomerProductResponse> {
    return this.http.get<CustomerProductResponse>(`${this.baseUrl}/products/${productId}`);
  }
}
