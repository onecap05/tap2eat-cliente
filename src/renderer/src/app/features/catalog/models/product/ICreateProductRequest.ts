import { IAvailabilityConfigRequest } from '../commons/IAvailabilityConfigRequest';
import { IImageMetadataRequest } from '../commons/IImageMetadataRequest';

export type ProductTypeRequest = 'SIMPLE' | 'CUSTOMIZABLE';

export interface ICreateProductRequest {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  productType: ProductTypeRequest;
  price: number;
  image?: IImageMetadataRequest | null;
  modifierGroups: unknown[];
  availability?: IAvailabilityConfigRequest | null;
  active: boolean;
  displayOrder?: number | null;
  featured: boolean;
  tags: string[];
  dietaryFlags: string[];
  allergens: string[];
}