import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ICategoryResponse } from '../models/category/ICategoryResponse';
import { ICreateCategoryRequest } from '../models/category/ICreateCategoryRequest';
import { IUpdateCategoryRequest } from '../models/category/IUpdateCategoryRequest';

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

  public updateCategory(
  categoryId: string,
  restaurantId: string,
  request: IUpdateCategoryRequest
): Observable<ICategoryResponse> {
  return this.http.put<ICategoryResponse>(
    `${this.baseUrl}/${categoryId}`,
    request,
    {
      params: {
        restaurantId
      }
    }
  );
}

public deleteCategory(categoryId: string, restaurantId: string): Observable<ICategoryResponse> {
  return this.http.patch<ICategoryResponse>(
    `${this.baseUrl}/${categoryId}/delete`,
    null,
    {
      params: {
        restaurantId
      }
    }
  );
}
}