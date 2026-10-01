import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TEHRAN = 'Asia/Tehran';

export const tehranTime = (value?: dayjs.ConfigType) => dayjs(value).tz(TEHRAN);

export const formatTehran = (value: dayjs.ConfigType, pattern: string) =>
  tehranTime(value).format(pattern);

const tehranParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TEHRAN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

const part = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) => parts.find((item) => item.type === type)?.value ?? '';

/** Date and time together, always Asia/Tehran. Example: 1 Oct 2026, 19:02:17 */
export const formatTehranDateTime = (value: string | number | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TEHRAN,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
};

/** Wall clock in Asia/Tehran, with the offset so the zone is visible. */
export const formatTehranAbsolute = (value: string | number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = tehranParts.formatToParts(date);
  const offset = part(parts, 'timeZoneName').replace('GMT', 'UTC');
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(
    parts,
    'day',
  )} ${part(parts, 'hour')}:${part(parts, 'minute')}:${part(
    parts,
    'second',
  )} ${offset}`;
};
