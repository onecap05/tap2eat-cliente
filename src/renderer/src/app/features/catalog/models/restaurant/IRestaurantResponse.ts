import { IImageMetadataResponse } from '../commons/IImageMetadataResponse';

export interface IRestaurantResponse {
  id: string;
  ownerAccountId: string;
  name: string;
  description?: string | null;
  logo?: IImageMetadataResponse | null;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}