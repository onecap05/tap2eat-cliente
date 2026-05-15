export type AvailabilityStatusRequest =
  | 'AVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'PERMANENTLY_UNAVAILABLE';

export type DayOfWeekRequest =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface ITimeRangeRequest {
  startTime: string;
  endTime: string;
}

export interface IDailyAvailabilityRequest {
  dayOfWeek: DayOfWeekRequest;
  enabled: boolean;
  timeRanges: ITimeRangeRequest[];
}

export interface IAvailabilityConfigRequest {
  status: AvailabilityStatusRequest;
  temporaryReason?: string | null;
  temporaryReasonDetail?: string | null;
  weeklySchedule: IDailyAvailabilityRequest[];
}