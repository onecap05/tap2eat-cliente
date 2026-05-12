import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ICategoryResponse } from '../models/category/ICategoryResponse';
import { ICreateCategoryRequest } from '../models/category/ICreateCategoryRequest';

@Injectable({
  providedIn: 'root'
})
export class CategoryApiService {
  private readonly baseUrl = `${environment.catalogApiUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  public getByRestaurantId(restaurantId: string): Observable<ICategoryResponse[]> {
    return this.http.get<ICategoryResponse[]>(`${this.baseUrl}/restaurant/${restaurantId}`);
  }

  public createCategory(request: ICreateCategoryRequest): Observable<ICategoryResponse> {
    return this.http.post<ICategoryResponse>(this.baseUrl, request);
  }
}