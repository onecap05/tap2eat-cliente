import { IImageMetadataRequest } from '../commons/IImageMetadataRequest';

export interface ICreateRestaurantRequest {
  ownerAccountId: string;
  name: string;
  rfc: string;
  description?: string | null;
  logo?: IImageMetadataRequest | null;
}