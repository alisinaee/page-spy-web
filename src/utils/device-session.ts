import { useSocketMessageStore } from '@/store/socket-message';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const normalizeForExport = (value: unknown, ancestors = new Set<unknown>()) => {
  if (value === null) return null;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'boolean') return value;
  if (valueType === 'number') return Number.isFinite(value) ? value : null;
  if (valueType === 'bigint') return value.toString();
  if (valueType === 'undefined' || valueType === 'function') return undefined;
  if (valueType === 'symbol') return value.toString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (ancestors.has(value)) return '[Circular]';
  ancestors.add(value);

  let normalized: JsonValue;
  if (Array.isArray(value)) {
    normalized = value.map((item) => {
      const result = normalizeForExport(item, ancestors);
      return result === undefined ? null : result;
    });
  } else if (value instanceof Map) {
    normalized = Object.fromEntries(
      Array.from(value.entries()).map(([key, item]) => [
        String(key),
        normalizeForExport(item, ancestors),
      ]),
    );
  } else if (value instanceof Set) {
    normalized = Array.from(value).map((item) => {
      const result = normalizeForExport(item, ancestors);
      return result === undefined ? null : result;
    });
  } else if (value instanceof Date) {
    normalized = value.toISOString();
  } else {
    const record = value as Record<string, unknown>;
    normalized = Object.entries(record).reduce<Record<string, JsonValue>>(
      (result, [key, item]) => {
        const normalizedItem = normalizeForExport(item, ancestors);
        if (normalizedItem !== undefined) result[key] = normalizedItem;
        return result;
      },
      {},
    );
  }

  ancestors.delete(value);
  return normalized;
};

export const createDeviceSessionSnapshot = (deviceId: string) => {
  const state = useSocketMessageStore.getState();
  return {
    exportedAt: new Date().toISOString(),
    deviceId: deviceId || 'unknown',
    clientInfo: state.clientInfo,
    console: state.consoleMsg,
    network: state.networkMsg,
    page: state.pageMsg,
    storage: state.storageMsg,
    system: state.systemMsg,
    database: state.databaseMsg,
    connections: state.connectMsg,
  };
};

export const serializeDeviceSession = (deviceId: string) =>
  JSON.stringify(
    normalizeForExport(createDeviceSessionSnapshot(deviceId)),
    null,
    2,
  );

const cleanNamePart = (value: string | undefined, fallback: string) =>
  (value || fallback).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') ||
  fallback;

export const suggestDeviceLogName = (deviceId: string, section = 'all') => {
  const info = useSocketMessageStore.getState().clientInfo;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const shortId = (deviceId || 'device').split('.')[0].slice(0, 8);
  return (
    [
      'pagespy',
      cleanNamePart(section, 'all'),
      'device',
      cleanNamePart(shortId, 'device'),
      cleanNamePart(info?.os?.name, 'os'),
      cleanNamePart(info?.browser?.name, 'browser'),
      stamp,
    ].join('_') + '.json'
  );
};

export const downloadDeviceSession = (deviceId: string, fileName?: string) => {
  const json = serializeDeviceSession(deviceId);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = (fileName || suggestDeviceLogName(deviceId)).trim();

  anchor.href = url;
  anchor.download = safeName.endsWith('.json') ? safeName : safeName + '.json';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
