import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CustomerFavoritesResponse,
  FavoriteProductResponse,
  FavoriteRestaurantResponse,
  FavoriteStatusResponse,
  FeaturedProductResponse
} from '../models/favorite.models';

@Injectable({
  providedIn: 'root'
})
export class CustomerFavoritesApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/favorites`;

  constructor(private readonly http: HttpClient) {}

  public addRestaurantFavorite(
    customerAccountId: string,
    restaurantId: string
  ): Observable<FavoriteRestaurantResponse> {
    return this.http.post<FavoriteRestaurantResponse>(
      `${this.baseUrl}/restaurants/${restaurantId}`,
      null,
      { params: this.customerParams(customerAccountId) }
    );
  }

  public removeRestaurantFavorite(customerAccountId: string, restaurantId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/restaurants/${restaurantId}`,
      { params: this.customerParams(customerAccountId) }
    );
  }

  public addProductFavorite(
    customerAccountId: string,
    productId: string
  ): Observable<FavoriteProductResponse> {
    return this.http.post<FavoriteProductResponse>(
      `${this.baseUrl}/products/${productId}`,
      null,
      { params: this.customerParams(customerAccountId) }
    );
  }

  public removeProductFavorite(customerAccountId: string, productId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/products/${productId}`,
      { params: this.customerParams(customerAccountId) }
    );
  }

  public getCustomerFavorites(customerAccountId: string): Observable<CustomerFavoritesResponse> {
    return this.http.get<CustomerFavoritesResponse>(
      `${this.baseUrl}/customers/${customerAccountId}`
    );
  }

  public getCustomerFavoriteRestaurants(customerAccountId: string): Observable<FavoriteRestaurantResponse[]> {
    return this.http.get<FavoriteRestaurantResponse[]>(
      `${this.baseUrl}/customers/${customerAccountId}/restaurants`
    );
  }

  public getCustomerFavoriteProducts(customerAccountId: string): Observable<FavoriteProductResponse[]> {
    return this.http.get<FavoriteProductResponse[]>(
      `${this.baseUrl}/customers/${customerAccountId}/products`
    );
  }

  public getCustomerFavoriteStatus(
    customerAccountId: string,
    restaurantIds: string[] = [],
    productIds: string[] = []
  ): Observable<FavoriteStatusResponse> {
    let params = new HttpParams();

    for (const restaurantId of restaurantIds) {
      params = params.append('restaurantIds', restaurantId);
    }

    for (const productId of productIds) {
      params = params.append('productIds', productId);
    }

    return this.http.get<FavoriteStatusResponse>(
      `${this.baseUrl}/customers/${customerAccountId}/status`,
      { params }
    );
  }

  public getFeaturedProduct(restaurantId: string): Observable<FeaturedProductResponse> {
    return this.http.get<FeaturedProductResponse>(
      `${this.baseUrl}/restaurants/${restaurantId}/featured-product`
    );
  }

  private customerParams(customerAccountId: string): HttpParams {
    return new HttpParams().set('customerAccountId', customerAccountId);
  }
}
