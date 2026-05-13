import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ImageMetadataResponse {
  url: string;
  objectKey: string;
  provider: 'CLOUDINARY' | 'MINIO' | 'S3';
  contentType: string;
  size: number;
  uploadedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {

  private readonly baseUrl = `${environment.catalogApiUrl}/uploads/images`;

  constructor(private readonly http: HttpClient) {}

  uploadProductImage(file: File): Observable<ImageMetadataResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImageMetadataResponse>(
      `${this.baseUrl}/products`,
      formData
    );
  }
}