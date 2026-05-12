import { IDailyAvailabilityResponse } from './IDailyAvailabilityResponse';

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'PERMANENTLY_UNAVAILABLE';

export type TemporaryUnavailabilityReason =
  | 'OUT_OF_STOCK'
  | 'NO_SUPPLIES'
  | 'MAINTENANCE'
  | 'SEASONAL'
  | 'OPERATIONAL_PAUSE';

export interface IAvailabilityConfigResponse {
  status: AvailabilityStatus;
  temporaryReason?: TemporaryUnavailabilityReason | null;
  temporaryReasonDetail?: string | null;
  weeklySchedule: IDailyAvailabilityResponse[];
}