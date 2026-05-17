export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

type TimeRangeLike = {
  startTime?: string | null;
  endTime?: string | null;
};

type DailyAvailabilityLike = {
  dayOfWeek?: string | null;
  enabled?: boolean | null;
  timeRanges?: TimeRangeLike[] | null;
};

type AvailabilityLike = {
  status?: string | null;
  weeklySchedule?: DailyAvailabilityLike[] | null;
};

type AvailabilityTarget = {
  active?: boolean | null;
  availability?: AvailabilityLike | null;
};

const DAYS: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
];

export function isOutOfSchedule(target: AvailabilityTarget | null | undefined, currentDate = new Date()): boolean {
  if (!target || target.active === false) {
    return false;
  }

  if (target.availability?.status !== 'AVAILABLE') {
    return false;
  }

  const weeklySchedule = target.availability?.weeklySchedule ?? [];

  if (weeklySchedule.length === 0) {
    return false;
  }

  const todaySchedule = weeklySchedule.find(day =>
    day.dayOfWeek === getCurrentDayOfWeek(currentDate)
  );

  if (!todaySchedule || !todaySchedule.enabled) {
    return true;
  }

  const timeRanges = todaySchedule.timeRanges ?? [];

  if (timeRanges.length === 0) {
    return true;
  }

  const currentTime = getCurrentTimeAsString(currentDate);

  return !timeRanges.some(range => isInsideTimeRange(currentTime, range));
}

function getCurrentDayOfWeek(currentDate: Date): DayOfWeek {
  return DAYS[currentDate.getDay()];
}

function getCurrentTimeAsString(currentDate: Date): string {
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function isInsideTimeRange(currentTime: string, range: TimeRangeLike): boolean {
  if (!range.startTime || !range.endTime) {
    return false;
  }

  return currentTime >= range.startTime && currentTime < range.endTime;
}