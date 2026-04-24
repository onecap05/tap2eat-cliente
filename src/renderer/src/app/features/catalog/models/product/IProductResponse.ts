import { IImageMetadataResponse } from '../commons/IImageMetadataResponse';
import { IAvailabilityConfigResponse } from '../commons/IAvailabilityConfigResponse';
import { IModifierGroupResponse } from '../commons/IModifierGroupResponse';

export type ProductType = 'SIMPLE' | 'CUSTOMIZABLE';

export interface IProductResponse {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  productType: ProductType;
  price: number;
  image?: IImageMetadataResponse | null;
  displayOrder?: number | null;
  featured: boolean;
  availability?: IAvailabilityConfigResponse | null;
  active: boolean;
  tags: string[];
  dietaryFlags: string[];
  allergens: string[];
  modifierGroups: IModifierGroupResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}