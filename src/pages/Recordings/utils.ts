import dayjs from 'dayjs';
import { formatTehranAbsolute } from '@/utils/tehran';
import prettyBytes from 'pretty-bytes';
import request from '@/apis/request';
import { requestGetLogFileContent } from '@/apis';

export interface Recording {
  fileId: string;
  name: string;
  size: number;
  createdAt: string;
  project: string;
  title: string;
  deviceId: string;
  remark: string;
  logTitle: string;
  userAgent: string;
}

/** The API returns the upload query as `tags`; flatten them into fields. */
export const toRecording = (log: I.SpyLog): Recording => {
  const tag = (key: string) =>
    String(log.tags?.find((i) => i.key === key)?.value ?? '');
  return {
    fileId: log.fileId,
    name: log.name,
    size: log.size,
    createdAt: log.createdAt,
    project: tag('project'),
    title: tag('title'),
    deviceId: tag('deviceId'),
    remark: tag('remark'),
    logTitle: tag('logTitle'),
    userAgent: tag('userAgent'),
  };
};

export const logFileUrl = (fileId: string) =>
  `${request.defaultPrefix}/log/download?fileId=${fileId}`;

export const viewerPath = (rec: Pick<Recording, 'fileId' | 'deviceId'>) => {
  const params = new URLSearchParams({ url: logFileUrl(rec.fileId) });
  if (rec.deviceId) params.set('device', rec.deviceId);
  return `/recordings/view?${params.toString()}`;
};

export const formatSize = (size: number) => prettyBytes(size || 0);

export const formatAbsolute = (value: string | number) =>
  formatTehranAbsolute(value);

/** Turn hard line breaks from the old narrow box into a normal paragraph. */
export const descriptionParagraphs = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) =>
      part
        .replace(/[ \t]*\n[ \t]*/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim(),
    )
    .filter(Boolean);

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export const formatRelative = (value: string | number, locale?: string) => {
  const seconds = Math.round((dayjs(value).valueOf() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(Math.round(seconds / 10) * 10, 'second');
};

/** Download through fetch so the auth header is sent when a password is set. */
export const downloadRecording = async (url: string, filename: string) => {
  const json = await requestGetLogFileContent(url);
  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
};
