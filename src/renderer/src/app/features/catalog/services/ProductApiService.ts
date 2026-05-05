import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { IProductResponse } from '../models/product/IProductResponse';
import { ICreateProductRequest } from '../models/product/ICreateProductRequest';

@Injectable({
  providedIn: 'root'
})
export class ProductApiService {
  private readonly baseUrl = 'http://localhost:8080/api/products';

  constructor(private readonly http: HttpClient) {}

  getByRestaurantId(restaurantId: string): Observable<IProductResponse[]> {
    return this.http.get<IProductResponse[]>(`${this.baseUrl}/restaurant/${restaurantId}`);
  }

  createProduct(request: ICreateProductRequest): Observable<IProductResponse> {
    return this.http.post<IProductResponse>(this.baseUrl, request);
  }
}