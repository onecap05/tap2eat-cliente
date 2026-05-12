import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { IProductResponse } from '../models/product/IProductResponse';
import { ICreateProductRequest } from '../models/product/ICreateProductRequest';

@Injectable({
  providedIn: 'root'
})
export class ProductApiService {
  private readonly baseUrl = `${environment.catalogApiUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  public getByRestaurantId(restaurantId: string): Observable<IProductResponse[]> {
    return this.http.get<IProductResponse[]>(`${this.baseUrl}/restaurant/${restaurantId}`);
  }

  public createProduct(request: ICreateProductRequest): Observable<IProductResponse> {
    return this.http.post<IProductResponse>(this.baseUrl, request);
  }
}