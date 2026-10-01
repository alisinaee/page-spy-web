import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TEHRAN = 'Asia/Tehran';

export const tehranTime = (value?: dayjs.ConfigType) => dayjs(value).tz(TEHRAN);

export const formatTehran = (value: dayjs.ConfigType, pattern: string) =>
  tehranTime(value).format(pattern);

export {
  formatTehranDateTime,
  formatTehranAbsolute,
  formatTehranStamp,
} from '../../smoke-test/tehran-time.js';
