import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IProductResponse } from '../models/product/IProductResponse';

@Injectable({
  providedIn: 'root'
})
export class ProductApiService {
  private readonly baseUrl = 'http://localhost:8080/api/products';

  constructor(private readonly http: HttpClient) {}

  getByRestaurantId(restaurantId: string): Observable<IProductResponse[]> {
    return this.http.get<IProductResponse[]>(`${this.baseUrl}/restaurant/${restaurantId}`);
  }
}