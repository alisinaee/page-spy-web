const TEHRAN = 'Asia/Tehran';

const partsFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  timeZone: TEHRAN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const asDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const read = (date) => {
  const parts = partsFormat.formatToParts(date);
  const pick = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour').padStart(2, '0'),
    minute: pick('minute').padStart(2, '0'),
    second: pick('second').padStart(2, '0'),
  };
};

/** Persian calendar, Asia/Tehran, date and time. Example: 1405/07/09 19:54:31 */
export const formatTehranDateTime = (value) => {
  const date = asDate(value);
  if (!date) return '';
  const part = read(date);
  return `${part.year}/${part.month}/${part.day} ${part.hour}:${part.minute}:${part.second}`;
};

/** Same clock, with the Tehran offset written out. */
export const formatTehranAbsolute = (value) => {
  const clock = formatTehranDateTime(value);
  return clock ? `${clock} UTC+03:30` : '';
};

/** Filename-safe Persian Tehran stamp. Example: 1405-07-09-19-54-31 */
export const formatTehranStamp = (value) => {
  const date = asDate(value);
  if (!date) return '';
  const part = read(date);
  return `${part.year}-${part.month}-${part.day}-${part.hour}-${part.minute}-${part.second}`;
};
