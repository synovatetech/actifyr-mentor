import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);

const API_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DEFAULT_TIME_ZONE = 'UTC';

// Normalize a date string that may include a time component (e.g. "2026-05-12T00:00:00")
// to a plain YYYY-MM-DD string so it can be combined with a separate time part.
const normalizeDatePart = (date?: string): string =>
  date ? date.split('T')[0] : dayjs().format('YYYY-MM-DD');

export interface DateTimePickerValue {
  date: string;
  hh: string;
  mm: string;
  period: 'AM' | 'PM';
}

const DEFAULT_PICKER_VALUE: DateTimePickerValue = {
  date: '',
  hh: '12',
  mm: '00',
  period: 'AM',
};

let cachedTimeZones: string[] | null = null;

export const getUserTimeZone = () => {
  if (typeof Intl === 'undefined') return DEFAULT_TIME_ZONE;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
};

/** Today's date as a plain YYYY-MM-DD string, for use as a date input's min/value. */
export const getTodayDateString = () => dayjs().format('YYYY-MM-DD');

/** True when `dateStr` (a plain date, or a date-time — only the date part is compared) is strictly before today. */
export const isDateBeforeToday = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;
  const d = dayjs(String(dateStr).slice(0, 10), 'YYYY-MM-DD', true);
  return d.isValid() && d.isBefore(dayjs().startOf('day'));
};

export const getAllTimeZones = () => {
  if (cachedTimeZones) return cachedTimeZones;

  const supportedValuesOf = (Intl as any)?.supportedValuesOf;
  if (typeof supportedValuesOf === 'function') {
    cachedTimeZones = supportedValuesOf('timeZone') as string[];
    return cachedTimeZones;
  }

  const fallback = getUserTimeZone();
  cachedTimeZones = [fallback, DEFAULT_TIME_ZONE].filter(
    (value, index, arr) => arr.indexOf(value) === index,
  );
  return cachedTimeZones;
};

export const formatTimeZoneLabel = (timeZone: string) => {
  try {
    const offset = dayjs().tz(timeZone).format('Z');
    return `(GMT${offset}) ${timeZone}`;
  } catch {
    return `(GMT+00:00) ${timeZone}`;
  }
};

const to24Hour = (hh: string, period: 'AM' | 'PM') => {
  let hour = Number.parseInt(hh, 10);
  if (Number.isNaN(hour)) hour = 12;
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return String(hour).padStart(2, '0');
};

export const convertIstPickerToUtcString = (dateTime: Partial<DateTimePickerValue>) => {
  return convertPickerToUtcString(dateTime, 'Asia/Kolkata');
};

export const convertUtcStringToIstPicker = (dateTimeStr?: string | null): DateTimePickerValue => {
  return convertUtcStringToPicker(dateTimeStr, 'Asia/Kolkata');
};

export const convertPickerToUtcString = (
  dateTime: Partial<DateTimePickerValue>,
  timeZone: string,
) => {
  if (!dateTime?.date) return '';

  const hour24 = to24Hour(
    dateTime.hh || '12',
    (dateTime.period as 'AM' | 'PM') || 'AM',
  );
  const minute = String(dateTime.mm || '00').padStart(2, '0');
  const normalizedInput = `${dateTime.date} ${hour24}:${minute}:00`;

  const zonedDateTime = dayjs.tz(normalizedInput, API_DATE_TIME_FORMAT, timeZone);
  if (!zonedDateTime.isValid()) return '';

  return zonedDateTime.utc().format(API_DATE_TIME_FORMAT);
};

export const convertUtcStringToPicker = (
  dateTimeStr?: string | null,
  timeZone: string = DEFAULT_TIME_ZONE,
): DateTimePickerValue => {
  if (!dateTimeStr) return DEFAULT_PICKER_VALUE;

  const parsedUtc =
    dayjs.utc(dateTimeStr, 'YYYY-MM-DD HH:mm:ss', true).isValid()
      ? dayjs.utc(dateTimeStr, 'YYYY-MM-DD HH:mm:ss', true)
      : dayjs.utc(dateTimeStr, 'YYYY-MM-DDTHH:mm:ss', true).isValid()
        ? dayjs.utc(dateTimeStr, 'YYYY-MM-DDTHH:mm:ss', true)
        : dayjs.utc(dateTimeStr);
  if (!parsedUtc.isValid()) return DEFAULT_PICKER_VALUE;

  const zonedDateTime = parsedUtc.tz(timeZone);
  const hour24 = zonedDateTime.hour();
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return {
    date: zonedDateTime.format('YYYY-MM-DD'),
    hh: String(hour12).padStart(2, '0'),
    mm: zonedDateTime.format('mm'),
    period,
  };
};

export const convert12HourTimeToUtcHHMM = (
  time: { hours: string; minutes: string; ampm: string },
  timeZone: string,
  referenceDate?: string,
) => {
  const datePart = normalizeDatePart(referenceDate);
  const hours24 = to24Hour(time.hours, time.ampm as 'AM' | 'PM');
  const normalized = `${datePart} ${hours24}:${String(time.minutes || '00').padStart(2, '0')}:00`;
  const zonedDateTime = dayjs.tz(normalized, API_DATE_TIME_FORMAT, timeZone);
  if (!zonedDateTime.isValid()) return '00:00';
  return zonedDateTime.utc().format('HH:mm');
};

export const convertUtcHHMMTo12HourTime = (
  utcTime: string,
  timeZone: string,
  referenceDate?: string,
) => {
  const datePart = normalizeDatePart(referenceDate);
  const normalizedTime = String(utcTime || '').trim();
  if (!normalizedTime) {
    return { hours: '12', minutes: '00', ampm: 'AM' as const };
  }

  const timeParts = normalizedTime.split(':');
  const paddedTime = `${String(timeParts[0] || '0').padStart(2, '0')}:${String(timeParts[1] || '00').padStart(2, '0')}:${String(timeParts[2] || '00').padStart(2, '0')}`;
  const input = `${datePart} ${paddedTime}`;
  const utcDateTime = dayjs.utc(input, API_DATE_TIME_FORMAT, true);
  if (!utcDateTime.isValid()) {
    return { hours: '12', minutes: '00', ampm: 'AM' as const };
  }

  const zonedDateTime = utcDateTime.tz(timeZone);
  const hour24 = zonedDateTime.hour();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    hours: String(hour12).padStart(2, '0'),
    minutes: zonedDateTime.format('mm'),
    ampm: (hour24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
};

export const convert12HourBetweenTimeZones = (
  time: { hours: string; minutes: string; ampm: string },
  fromTimeZone: string,
  toTimeZone: string,
  referenceDate?: string,
) => {
  const datePart = normalizeDatePart(referenceDate);
  const hour24 = to24Hour(time.hours, time.ampm as 'AM' | 'PM');
  const normalized = `${datePart} ${hour24}:${String(time.minutes || '00').padStart(2, '0')}:00`;
  const source = dayjs.tz(normalized, API_DATE_TIME_FORMAT, fromTimeZone);
  if (!source.isValid()) {
    return { hours: '12', minutes: '00', ampm: 'AM' as const };
  }

  const target = source.tz(toTimeZone);
  const targetHour24 = target.hour();
  const targetHour12 = targetHour24 % 12 === 0 ? 12 : targetHour24 % 12;
  return {
    hours: String(targetHour12).padStart(2, '0'),
    minutes: target.format('mm'),
    ampm: (targetHour24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
};
