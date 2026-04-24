import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IBranchResponse } from '../models/branch/IBranchResponse';

@Injectable({
  providedIn: 'root'
})
export class BranchApiService {
  private readonly baseUrl = 'http://localhost:8080/api/branches';

  constructor(private readonly http: HttpClient) {}

  getByRestaurantId(restaurantId: string): Observable<IBranchResponse[]> {
    return this.http.get<IBranchResponse[]>(`${this.baseUrl}/restaurant/${restaurantId}`);
  }
}