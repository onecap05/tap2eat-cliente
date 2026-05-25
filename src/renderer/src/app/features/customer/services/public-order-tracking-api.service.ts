import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PublicOrderTrackingResponse } from '../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class PublicOrderTrackingApiService {
  private readonly http: HttpClient;
  private readonly baseUrl = `${environment.apiBaseUrl}/orders/public/track`;

  constructor(httpBackend: HttpBackend) {
    this.http = new HttpClient(httpBackend);
  }

  public getByPublicTrackingCode(publicTrackingCode: string): Observable<PublicOrderTrackingResponse> {
    return this.http.get<PublicOrderTrackingResponse>(
      `${this.baseUrl}/${encodeURIComponent(publicTrackingCode)}`
    );
  }
}
