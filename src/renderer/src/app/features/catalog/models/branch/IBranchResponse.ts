import { IAvailabilityConfigResponse } from '../commons/IAvailabilityConfigResponse';

export interface IBranchResponse {
  id: string;
  restaurantId: string;
  name: string;
  phoneNumber?: string | null;
  formattedAddress: string;
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