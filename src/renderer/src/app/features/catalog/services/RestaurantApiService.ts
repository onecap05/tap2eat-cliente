import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { IRestaurantResponse } from '../models/restaurant/IRestaurantResponse';
import { ICreateRestaurantRequest } from '../models/restaurant/ICreateRestaurantRequest';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class RestaurantApiService {
  private readonly API_URL = `${environment.catalogApiUrl}/restaurants`;

  constructor(private readonly http: HttpClient) {}

  getByOwnerAccountId(ownerAccountId: string): Observable<IRestaurantResponse> {
    return this.http.get<IRestaurantResponse>(`${this.API_URL}/owner/${ownerAccountId}`);
  }

  createRestaurant(request: ICreateRestaurantRequest): Observable<IRestaurantResponse> {
    return this.http.post<IRestaurantResponse>(this.API_URL, request);
  }
}