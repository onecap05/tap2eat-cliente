import { IAvailabilityConfigResponse } from '../commons/IAvailabilityConfigResponse';

export interface IBranchResponse {
  id: string;
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
  availability?: IAvailabilityConfigResponse | null;
  isMainBranch: boolean;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}