import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ICategoryResponse } from '../models/category/ICategoryResponse';
import { ICreateCategoryRequest } from '../models/category/ICreateCategoryRequest';

@Injectable({
  providedIn: 'root'
})
export class CategoryApiService {
  private readonly baseUrl = 'http://localhost:8080/api/categories';

  constructor(private readonly http: HttpClient) {}

  getByRestaurantId(restaurantId: string): Observable<ICategoryResponse[]> {
    return this.http.get<ICategoryResponse[]>(`${this.baseUrl}/restaurant/${restaurantId}`);
  }

  createCategory(request: ICreateCategoryRequest): Observable<ICategoryResponse> {
    return this.http.post<ICategoryResponse>(this.baseUrl, request);
  }
}