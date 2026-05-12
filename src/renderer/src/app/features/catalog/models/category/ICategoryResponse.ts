import { IImageMetadataResponse } from '../commons/IImageMetadataResponse';
import { IAvailabilityConfigResponse } from '../commons/IAvailabilityConfigResponse';

export interface ICategoryResponse {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  displayOrder?: number | null;
  image?: IImageMetadataResponse | null;
  availability?: IAvailabilityConfigResponse | null;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}