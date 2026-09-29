import {
  LOST_REQUEST_BODIES,
  shellQuote,
  buildCurlCommand,
} from '../../../smoke-test/log-format.js';

export { LOST_REQUEST_BODIES, shellQuote, buildCurlCommand };

const dataUrlParts = (data: string) => {
  if (!data.startsWith('data:')) return null;
  const comma = data.indexOf(',');
  if (comma < 0) return null;
  const meta = data.slice('data:'.length, comma);
  return {
    mime: (meta.split(';')[0] || '').trim().toLowerCase(),
    isBase64: /;\s*base64/i.test(meta),
    payload: data.slice(comma + 1),
  };
};

export const isMediaMime = (mime: string) =>
  mime.startsWith('image/') ||
  mime.startsWith('video/') ||
  mime.startsWith('audio/');

export const isTextLike = (mime: string, text: string) => {
  if (
    /json|text\/|xml|javascript|x-www-form-urlencoded|\+json|svg/.test(mime)
  ) {
    return true;
  }
  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};

export const decodeDataUrl = (
  data: string,
): { mime: string; text: string } | null => {
  const parts = dataUrlParts(data);
  if (!parts || isMediaMime(parts.mime)) return null;
  try {
    if (parts.isBase64) {
      const binary = atob(parts.payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return { mime: parts.mime, text: new TextDecoder().decode(bytes) };
    }
    return { mime: parts.mime, text: decodeURIComponent(parts.payload) };
  } catch (error) {
    return null;
  }
};

export const parseMediaSummary = (
  response: unknown,
): { type: string; size: number } | null => {
  if (typeof response === 'string') {
    const match = response.match(/^\[([a-zA-Z0-9_\-\+/]+)\s+(\d+)\s+bytes\]$/);
    if (match) {
      return { type: match[1], size: Number(match[2]) };
    }
  }
  if (typeof response === 'object' && response !== null) {
    const r = response as Record<string, unknown>;
    const type = (r.type || r.mime) as string | undefined;
    const size = typeof r.size === 'number' ? r.size : undefined;
    if (type && size !== undefined) {
      return { type, size };
    }
  }
  return null;
};

export const responseLogText = (
  response: unknown,
  responseReason?: string | null,
) => {
  if (typeof response === 'string' && response.startsWith('data:')) {
    const mime = dataUrlParts(response)?.mime || '';
    if (isMediaMime(mime)) return `[${mime}]`;
    const decoded = decodeDataUrl(response);
    if (decoded && isTextLike(decoded.mime, decoded.text)) {
      const trimmed = decoded.text.trim();
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch (error) {
        return decoded.text;
      }
    }
    if (mime) return `[${mime}]`;
  }
  const summary = parseMediaSummary(response);
  if (summary) {
    return `[${summary.type} ${summary.size} bytes]`;
  }
  if (response && typeof response !== 'string') {
    try {
      return JSON.stringify(response, null, 2);
    } catch (error) {
      return String(response);
    }
  }
  if (typeof response === 'string' && response) return response;
  return responseReason || '';
};
