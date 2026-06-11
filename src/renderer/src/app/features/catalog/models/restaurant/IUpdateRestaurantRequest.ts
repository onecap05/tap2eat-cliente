import { IImageMetadataRequest } from '../commons/IImageMetadataRequest';

export interface IUpdateRestaurantRequest {
  name: string;
  rfc: string;
  description?: string | null;
  logo?: IImageMetadataRequest | null;
}