import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { IProductResponse } from '../models/product/IProductResponse';
import { ICreateProductRequest } from '../models/product/ICreateProductRequest';
import { IUpdateProductRequest } from '../models/product/IUpdateProductRequest';
import { IPauseProductRequest } from '../models/product/IPauseProductRequest';

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

  public updateProduct(
    productId: string,
    restaurantId: string,
    request: IUpdateProductRequest
  ): Observable<IProductResponse> {
    return this.http.put<IProductResponse>(
      `${this.baseUrl}/${productId}`,
      request,
      {
        params: {
          restaurantId
        }
      }
    );
  }

  public deactivateProduct(
    productId: string,
    restaurantId: string
  ): Observable<IProductResponse> {
    return this.http.patch<IProductResponse>(
      `${this.baseUrl}/${productId}/deactivate`,
      null,
      {
        params: {
          restaurantId
        }
      }
    );
  }

  public activateProduct(
    productId: string,
    restaurantId: string
  ): Observable<IProductResponse> {
    return this.http.patch<IProductResponse>(
      `${this.baseUrl}/${productId}/activate`,
      null,
      {
        params: {
          restaurantId
        }
      }
    );
  }

  public pauseProduct(
  productId: string,
  restaurantId: string,
  request: IPauseProductRequest
): Observable<IProductResponse> {
  return this.http.patch<IProductResponse>(
    `${this.baseUrl}/${productId}/pause`,
    request,
    {
      params: {
        restaurantId
      }
    }
  );
}

public resumeProduct(
  productId: string,
  restaurantId: string
): Observable<IProductResponse> {
  return this.http.patch<IProductResponse>(
    `${this.baseUrl}/${productId}/resume`,
    null,
    {
      params: {
        restaurantId
      }
    }
  );
}
}