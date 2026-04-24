import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IRestaurantResponse } from '../models/restaurant/IRestaurantResponse';

@Injectable({
  providedIn: 'root'
})
export class RestaurantApiService {
  private readonly baseUrl = 'http://localhost:8080/api/restaurants';

  constructor(private readonly http: HttpClient) {}

  getByOwnerAccountId(ownerAccountId: string): Observable<IRestaurantResponse> {
    return this.http.get<IRestaurantResponse>(`${this.baseUrl}/owner/${ownerAccountId}`);
  }
}