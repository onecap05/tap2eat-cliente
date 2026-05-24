import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RecommendationBranchResponse } from '../models/recommendation.models';

@Injectable({
  providedIn: 'root'
})
export class RecommendationApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/recommendations`;

  constructor(private readonly http: HttpClient) {}

  public getNearbyRecommendations(
    lat?: number,
    lng?: number,
    radiusKm?: number
  ): Observable<RecommendationBranchResponse[]> {
    return this.http.get<RecommendationBranchResponse[]>(
      `${this.baseUrl}/nearby`,
      { params: this.buildLocationParams(lat, lng, radiusKm) }
    );
  }

  public getCustomerRecommendations(
    customerAccountId: string,
    lat?: number,
    lng?: number,
    radiusKm?: number
  ): Observable<RecommendationBranchResponse[]> {
    return this.http.get<RecommendationBranchResponse[]>(
      `${this.baseUrl}/customers/${customerAccountId}`,
      { params: this.buildLocationParams(lat, lng, radiusKm) }
    );
  }

  public getNearestBranch(
    restaurantId: string,
    lat?: number,
    lng?: number
  ): Observable<RecommendationBranchResponse> {
    return this.http.get<RecommendationBranchResponse>(
      `${this.baseUrl}/restaurants/${restaurantId}/nearest-branch`,
      { params: this.buildLocationParams(lat, lng) }
    );
  }

  private buildLocationParams(lat?: number, lng?: number, radiusKm?: number): HttpParams {
    let params = new HttpParams();

    if (lat !== undefined && lng !== undefined) {
      params = params
        .set('lat', String(lat))
        .set('lng', String(lng));
    }

    if (radiusKm !== undefined) {
      params = params.set('radiusKm', String(radiusKm));
    }

    return params;
  }
}
