import { IAvailabilityConfigRequest } from '../commons/IAvailabilityConfigRequest';
import { IImageMetadataRequest } from '../commons/IImageMetadataRequest';

export interface IUpdateCategoryRequest {
  name: string;
  description?: string | null;
  displayOrder?: number | null;
  image?: IImageMetadataRequest | null;
  availability?: IAvailabilityConfigRequest | null;
}