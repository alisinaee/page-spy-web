export const LOST_REQUEST_BODIES = new Set([
  '[object TypedArray]',
  '[object Blob]',
  '[object ArrayBuffer]',
  '[object Object]',
]);

export const shellQuote = (value: string) =>
  `'${String(value ?? '').replace(/'/g, `'\\''`)}`;

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

type HeaderPairs = [string, string][] | null | undefined;
type Payload = string | [string, string][] | null | undefined;
type CookieInput =
  | Record<string, { value: string }>
  | Array<{ name?: string; value?: string }>
  | null;

const cookieHeader = (cookie: CookieInput) => {
  if (!cookie) return '';
  if (Array.isArray(cookie)) {
    return cookie
      .filter((item) => item?.name)
      .map((item) => `${item.name}=${item.value ?? ''}`)
      .join(';');
  }
  return Object.entries(cookie)
    .map(([key, item]) => `${key}=${item.value}`)
    .join(';');
};

const contentTypeOf = (headers: HeaderPairs) => {
  const found = headers?.find(([key]) => key.toLowerCase() === 'content-type');
  return (found?.[1] || '').toLowerCase();
};

const skipHeader = (key: string) => {
  const name = key.toLowerCase();
  return name === 'content-length' || name === 'host';
};

export const buildCurlCommand = (
  row: {
    url: string;
    method: string;
    requestHeader?: HeaderPairs;
    requestPayload?: Payload;
    withCredentials?: boolean;
  },
  cookie?: CookieInput,
) => {
  const { url, method, requestHeader, requestPayload, withCredentials } = row;
  const lines = [`curl -X ${method || 'GET'} ${shellQuote(url || '')}`];
  requestHeader?.forEach(([key, value]) => {
    if (skipHeader(key)) return;
    lines.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
  });
  if (withCredentials && cookie) {
    const cookieInfo = cookieHeader(cookie);
    if (cookieInfo) lines.push(`  -H ${shellQuote(`cookie: ${cookieInfo}`)}`);
  }

  const contentType = contentTypeOf(requestHeader);
  let note = '';
  if (typeof requestPayload === 'string') {
    if (LOST_REQUEST_BODIES.has(requestPayload)) {
      note = `body not captured: ${requestPayload}`;
    } else if (requestPayload) {
      lines.push(`  --data-raw ${shellQuote(requestPayload)}`);
    }
  } else if (requestPayload?.length) {
    if (contentType.includes('multipart/form-data')) {
      requestPayload.forEach(([key, value]) => {
        lines.push(`  --form ${shellQuote(`${key}=${value}`)}`);
      });
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      requestPayload.forEach(([key, value]) => {
        lines.push(`  --data-urlencode ${shellQuote(`${key}=${value}`)}`);
      });
    } else {
      lines.push(
        `  --data-raw ${shellQuote(
          JSON.stringify(Object.fromEntries(requestPayload)),
        )}`,
      );
    }
  }

  const command = lines.join(' \\\n');
  return note ? `${command}\n# ${note}` : command;
};
