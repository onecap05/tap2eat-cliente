import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { IBranchResponse } from '../models/branch/IBranchResponse';
import { ICreateBranchRequest } from '../models/branch/ICreateBranchRequest';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BranchApiService {
  private readonly API_URL = `${environment.catalogApiUrl}/branches`;

  constructor(private readonly http: HttpClient) {}

  getByRestaurantId(restaurantId: string): Observable<IBranchResponse[]> {
    return this.http.get<IBranchResponse[]>(`${this.API_URL}/restaurant/${restaurantId}`);
  }

  createBranch(request: ICreateBranchRequest): Observable<IBranchResponse> {
    return this.http.post<IBranchResponse>(this.API_URL, request);
  }
}