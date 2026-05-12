import { IAvailabilityConfigRequest } from '../commons/IAvailabilityConfigRequest';
import { IImageMetadataRequest } from '../commons/IImageMetadataRequest';

export interface ICreateCategoryRequest {
  restaurantId: string;
  name: string;
  description?: string | null;
  displayOrder?: number | null;
  image?: IImageMetadataRequest | null;
  availability?: IAvailabilityConfigRequest | null;
}