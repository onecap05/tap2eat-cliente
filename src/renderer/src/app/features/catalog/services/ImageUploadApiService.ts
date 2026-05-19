import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ImageMetadataResponse {
  url: string;
  objectKey: string;
  provider: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadApiService {
  private readonly baseUrl = `${environment.catalogApiUrl}/uploads/images`;

  constructor(private readonly http: HttpClient) {}

  public uploadProductImage(file: File): Observable<ImageMetadataResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImageMetadataResponse>(
      `${this.baseUrl}/products`,
      formData
    );
  }

  public uploadRestaurantLogo(file: File): Observable<ImageMetadataResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return this.http.post<ImageMetadataResponse>(
    `${this.baseUrl}/restaurants/logos`,
    formData
  );
}
}