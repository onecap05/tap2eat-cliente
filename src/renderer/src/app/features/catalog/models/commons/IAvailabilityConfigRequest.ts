export type AvailabilityStatusRequest =
  | 'AVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'PERMANENTLY_UNAVAILABLE';

export interface IAvailabilityConfigRequest {
  status: AvailabilityStatusRequest;
  temporaryReason?: string | null;
  temporaryReasonDetail?: string | null;
  weeklySchedule: unknown[];
}