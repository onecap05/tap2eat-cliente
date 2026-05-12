import { ITimeRangeResponse } from './ITimeRangeResponse';
export interface IDailyAvailabilityResponse {
  dayOfWeek: string;
  enabled: boolean;
  timeRanges: ITimeRangeResponse[];
}