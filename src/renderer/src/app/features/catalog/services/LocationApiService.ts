import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { IPostalCodeLookupResponse } from '../models/location/IPostalCodeLookupResponse';

@Injectable({
  providedIn: 'root'
})
export class LocationApiService {
  private readonly baseUrl = `${environment.catalogApiUrl}/locations`;

  constructor(private readonly http: HttpClient) {}

  public lookupPostalCode(postalCode: string): Observable<IPostalCodeLookupResponse> {
    return this.http.get<IPostalCodeLookupResponse>(
      `${this.baseUrl}/postal-codes/${postalCode}`
    );
  }
}