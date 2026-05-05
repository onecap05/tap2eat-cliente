import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { IBranchResponse } from '../models/branch/IBranchResponse';
import { ICreateBranchRequest } from '../models/branch/ICreateBranchRequest';

@Injectable({
  providedIn: 'root'
})
export class BranchApiService {
  private readonly baseUrl = 'http://localhost:8080/api/branches';

  constructor(private readonly http: HttpClient) {}

  getByRestaurantId(restaurantId: string): Observable<IBranchResponse[]> {
    return this.http.get<IBranchResponse[]>(`${this.baseUrl}/restaurant/${restaurantId}`);
  }

  createBranch(request: ICreateBranchRequest): Observable<IBranchResponse> {
    return this.http.post<IBranchResponse>(this.baseUrl, request);
  }
}