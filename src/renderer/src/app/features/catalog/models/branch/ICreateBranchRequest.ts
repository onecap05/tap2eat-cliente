import { IAvailabilityConfigRequest } from '../commons/IAvailabilityConfigRequest';

export interface ICreateBranchRequest {
  restaurantId: string;
  name: string;
  phoneNumber?: string | null;
  formattedAddress: string;
  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  addressReference?: string | null;
  latitude: number;
  longitude: number;
  googlePlaceId?: string | null;
  availability?: IAvailabilityConfigRequest | null;
  isMainBranch: boolean;
}