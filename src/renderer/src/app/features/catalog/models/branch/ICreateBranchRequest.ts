import { IAvailabilityConfigRequest } from '../commons/IAvailabilityConfigRequest';

export interface ICreateBranchRequest {
  restaurantId: string;
  name: string;
  phoneNumber?: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string | null;
  availability?: IAvailabilityConfigRequest | null;
  isMainBranch: boolean;
}