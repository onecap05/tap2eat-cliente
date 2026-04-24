export interface IImageMetadataResponse {
  url: string;
  objectKey: string;
  provider: string;
  contentType?: string | null;
  size?: number | null;
  uploadedAt?: string | null;
}