import type { SpyConsole } from '@huolala-tech/page-spy-types';
import { ResolvedNetworkInfo, resolveUrlInfo } from '@/utils';
import { PLACEHOLDER_RESPONSE } from '@/utils/constants';
import { getStatusInfo } from '@/components/NetworkTable/utils';

/**
 * Parsing for uploaded recordings (the file DataHarbor, or the on-device
 * "Upload logs" button, sends to /log/upload). Read-only: nothing here touches
 * the live socket-message store.
 */

export interface RecordingItem {
  type: string;
  timestamp: number;
  data: any;
}

export interface RecordingMeta {
  ua?: string;
  title?: string;
  url?: string;
  remark?: string;
  logTitle?: string;
  startTime?: number;
  endTime?: number;
}

export interface TimelineMark {
  kind: 'error' | 'request';
  /** epoch ms */
  time: number;
  /** id of the console item or network request */
  refId: string;
}

export interface Recording {
  meta: RecordingMeta;
  startTime: number;
  endTime: number;
  console: SpyConsole.DataItem[];
  consoleTimes: number[];
  network: ResolvedNetworkInfo[];
  marks: TimelineMark[];
}

// The SDK stores `data` as a zlib-compressed latin1 string. Plain objects are
// accepted too (the on-device uploader falls back to them without
// CompressionStream).
const inflate = async (text: string) => {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 255;
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).text();
};

const decodeData = async (data: unknown) => {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(await inflate(data));
  } catch (e) {
    return null;
  }
};

export const decodeItems = async (raw: unknown): Promise<RecordingItem[]> => {
  if (!Array.isArray(raw)) throw new Error('Not a recording file');
  const out: RecordingItem[] = [];
  const BATCH = 100;
  for (let i = 0; i < raw.length; i += BATCH) {
    const part = await Promise.all(
      raw.slice(i, i + BATCH).map(async (item: any) => ({
        type: String(item?.type ?? ''),
        timestamp: Number(item?.timestamp) || 0,
        data: await decodeData(item?.data),
      })),
    );
    out.push(...part);
  }
  return out;
};

const mergeNetwork = (items: RecordingItem[]) => {
  const byId = new Map<string, ResolvedNetworkInfo>();
  items.forEach(({ data }) => {
    if (!data?.id) return;
    const next = {
      ...data,
      ...resolveUrlInfo(data.url),
    } as ResolvedNetworkInfo;
    const stream =
      next.requestType === 'websocket' || next.requestType === 'eventsource';
    if (stream) {
      const prev = byId.get(next.id);
      const previous =
        prev && Array.isArray(prev.response) ? prev.response : [];
      const hasMessage =
        next.response && next.response !== PLACEHOLDER_RESPONSE;
      next.response = hasMessage
        ? [
            ...previous,
            {
              id: next.lastEventId,
              timestamp: next.endTime,
              data: next.response,
            },
          ]
        : previous;
    }
    byId.set(next.id, next);
  });
  return [...byId.values()].sort((a, b) => a.startTime - b.startTime);
};

export const parseRecording = async (raw: unknown): Promise<Recording> => {
  const items = await decodeItems(raw);
  const metaItem = [...items].reverse().find((i) => i.type === 'meta');
  const meta: RecordingMeta = metaItem?.data ?? {};

  const consoleItems = items.filter((i) => i.type === 'console' && i.data);
  const networkItems = items.filter((i) => i.type === 'network' && i.data);
  const timed = items.filter((i) => i.type !== 'meta' && i.timestamp > 0);

  const startTime =
    meta.startTime ?? timed[0]?.timestamp ?? metaItem?.timestamp ?? 0;
  const endTime =
    meta.endTime ?? timed[timed.length - 1]?.timestamp ?? startTime;

  const network = mergeNetwork(networkItems);

  const marks: TimelineMark[] = [];
  consoleItems.forEach((i) => {
    if (i.data.logType === 'error') {
      marks.push({
        kind: 'error',
        time: i.timestamp,
        refId: String(i.data.id),
      });
    }
  });
  network.forEach((row) => {
    if (getStatusInfo(row).status === 'error') {
      marks.push({
        kind: 'request',
        time: Number(row.startTime) || startTime,
        refId: row.id,
      });
    }
  });
  marks.sort((a, b) => a.time - b.time);

  return {
    meta,
    startTime,
    endTime: Math.max(endTime, startTime),
    console: consoleItems.map((i) => i.data as SpyConsole.DataItem),
    consoleTimes: consoleItems.map((i) => i.timestamp),
    network,
    marks,
  };
};
