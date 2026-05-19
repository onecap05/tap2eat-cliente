import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { IBranchResponse } from '../../catalog/models/branch/IBranchResponse';
import { ICategoryResponse } from '../../catalog/models/category/ICategoryResponse';
import { IProductResponse } from '../../catalog/models/product/IProductResponse';
import { IRestaurantResponse } from '../../catalog/models/restaurant/IRestaurantResponse';

@Injectable({
  providedIn: 'root'
})
export class CustomerCatalogApiService {
  private readonly baseUrl = `${environment.catalogApiUrl}/customer`;

  constructor(private readonly http: HttpClient) {}

  public getRestaurants(): Observable<IRestaurantResponse[]> {
    return this.http.get<IRestaurantResponse[]>(`${this.baseUrl}/restaurants`);
  }

  public getRestaurant(restaurantId: string): Observable<IRestaurantResponse> {
    return this.http.get<IRestaurantResponse>(`${this.baseUrl}/restaurants/${restaurantId}`);
  }

  public getBranches(restaurantId: string): Observable<IBranchResponse[]> {
    return this.http.get<IBranchResponse[]>(`${this.baseUrl}/restaurants/${restaurantId}/branches`);
  }

  public getCategories(restaurantId: string): Observable<ICategoryResponse[]> {
    return this.http.get<ICategoryResponse[]>(`${this.baseUrl}/restaurants/${restaurantId}/categories`);
  }

  public getProducts(restaurantId: string): Observable<IProductResponse[]> {
    return this.http.get<IProductResponse[]>(`${this.baseUrl}/restaurants/${restaurantId}/products`);
  }

  public getProduct(productId: string): Observable<IProductResponse> {
    return this.http.get<IProductResponse>(`${this.baseUrl}/products/${productId}`);
  }
}
