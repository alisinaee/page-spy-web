export const LOST_REQUEST_BODIES = new Set([
  '[object TypedArray]',
  '[object Blob]',
  '[object ArrayBuffer]',
  '[object Object]',
]);

export const shellQuote = (value) =>
  `'${String(value ?? '').replace(/'/g, `'\\''`)}'`;

const SECRET_HEADER_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
]);

const HEADER_KEYS = new Set([
  'requestheader',
  'responseheader',
  'requestheaders',
  'responseheaders',
]);

const isSecretHeaderName = (name) =>
  typeof name === 'string' &&
  SECRET_HEADER_NAMES.has(name.trim().toLowerCase());

export const fileNameFromPlaceholder = (value) => {
  const text = String(value ?? '');
  if (!text.startsWith('(file')) return null;
  const quoted = text.match(/\bname="([^"]*)"/);
  if (quoted) return quoted[1];
  const named = text.match(/\bname=(.*?)\s+(?:type=|size=)/);
  if (named) return named[1].trim();
  const bare = text.match(/\bname=([^)]+)/);
  if (bare) return bare[1].trim();
  return '';
};

const contentTypeOf = (headers) => {
  const found = headers?.find(
    ([key]) => String(key).toLowerCase() === 'content-type',
  );
  return String(found?.[1] || '').toLowerCase();
};

const skipHeader = (key) => {
  const name = String(key).toLowerCase();
  return name === 'content-length' || name === 'host';
};

const cookieHeader = (cookie) => {
  if (!cookie) return '';
  if (Array.isArray(cookie)) {
    return cookie
      .filter((item) => item?.name)
      .map((item) => `${item.name}=${item.value ?? ''}`)
      .join(';');
  }
  return Object.entries(cookie)
    .map(([key, item]) => `${key}=${item?.value ?? ''}`)
    .join(';');
};

export const buildCurlCommand = (row, cookie) => {
  const { url, method, requestHeader, requestPayload, withCredentials } =
    row || {};
  const lines = [`curl -X ${method || 'GET'} ${shellQuote(url || '')}`];
  const contentType = contentTypeOf(requestHeader);
  const isMultipart = contentType.includes('multipart/form-data');
  requestHeader?.forEach(([key, value]) => {
    if (skipHeader(key)) return;
    if (isMultipart && String(key).toLowerCase() === 'content-type') return;
    lines.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
  });
  if (withCredentials && cookie) {
    const cookieInfo = cookieHeader(cookie);
    if (cookieInfo) lines.push(`  -H ${shellQuote(`cookie: ${cookieInfo}`)}`);
  }

  const notes = [];
  if (typeof requestPayload === 'string') {
    if (LOST_REQUEST_BODIES.has(requestPayload)) {
      notes.push(`body not captured: ${requestPayload}`);
    } else if (requestPayload) {
      lines.push(`  --data-raw ${shellQuote(requestPayload)}`);
    }
  } else if (requestPayload?.length) {
    if (isMultipart) {
      requestPayload.forEach(([key, value]) => {
        const fileName = fileNameFromPlaceholder(value);
        if (fileName === null) {
          lines.push(`  --form ${shellQuote(`${key}=${value}`)}`);
          return;
        }
        if (!fileName) {
          notes.push(`file not captured: ${key}`);
          return;
        }
        lines.push(`  --form ${shellQuote(`${key}=@${fileName}`)}`);
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
  } else if (requestPayload && typeof requestPayload === 'object') {
    lines.push(`  --data-raw ${shellQuote(JSON.stringify(requestPayload))}`);
  }

  const command = lines.join(' \\\n');
  return notes.length ? `${command}\n# ${notes.join('; ')}` : command;
};

const redactCookieValue = (value) => {
  if (typeof value === 'string') return '<redacted>';
  if (Array.isArray(value)) return value.map((item) => redactCookieEntry(item));
  if (value && typeof value === 'object') {
    const next = { ...value };
    if ('value' in next) next.value = '<redacted>';
    return next;
  }
  return '<redacted>';
};

const redactCookieEntry = (item) => {
  if (typeof item === 'string') return '<redacted>';
  if (!item || typeof item !== 'object') return item;
  if ('value' in item) return { ...item, value: '<redacted>' };
  return item;
};

const redactHeaderList = (headers) => {
  if (!Array.isArray(headers)) return headers;
  return headers.map((item) => {
    if (
      Array.isArray(item) &&
      item.length === 2 &&
      isSecretHeaderName(item[0])
    ) {
      return [item[0], '<redacted>'];
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const name = item.name || item.key;
      if (isSecretHeaderName(name) && 'value' in item) {
        return { ...item, value: '<redacted>' };
      }
    }
    return item;
  });
};

export const redactSecrets = (value, seen = new Set()) => {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    const list = value.map((item) => redactSecrets(item, seen));
    seen.delete(value);
    return list;
  }
  const result = {};
  Object.entries(value).forEach(([key, item]) => {
    const lower = key.toLowerCase();
    if (HEADER_KEYS.has(lower)) {
      result[key] = redactHeaderList(item);
      return;
    }
    if (lower === 'cookie' || lower === 'cookies') {
      result[key] = redactCookieValue(item);
      return;
    }
    result[key] = redactSecrets(item, seen);
  });
  seen.delete(value);
  return result;
};

const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

export const stripAnsi = (value) => String(value ?? '').replace(ANSI_REGEX, '');

const BOX_CHARS_REGEX = /[┌┐└┘│├┤┬┴┼─]/;

export const isBoxSeparator = (line) => {
  const stripped = stripAnsi(line).trim();
  if (!stripped) return false;
  return (
    /^[┌┐└┘│├┤┬┴┼─\s_\-]+$/.test(stripped) && BOX_CHARS_REGEX.test(stripped)
  );
};

export const stripBoxBorder = (line) => {
  const cleaned = stripAnsi(line);
  return cleaned.replace(/^[ \t]*│ ?/, '').replace(/ ?│[ \t]*$/, '');
};

export function createBoxLineGrouper(onFlush) {
  let inBox = false;
  let lines = [];
  let firstMeta = null;

  const flush = () => {
    if (!lines.length) {
      inBox = false;
      firstMeta = null;
      return;
    }
    const joined = lines.join('\n');
    onFlush({
      message: joined,
      level: firstMeta?.level || 'log',
      meta: firstMeta,
    });
    lines = [];
    firstMeta = null;
    inBox = false;
  };

  const feedOneLine = (rawLine, meta) => {
    const rawStr = String(rawLine ?? '');
    const hasStart = /[┌]/.test(rawStr);
    const hasEnd = /[└┘]/.test(rawStr);
    const hasBoxChar = BOX_CHARS_REGEX.test(rawStr);

    if (hasStart) {
      flush();
      inBox = true;
      if (!isBoxSeparator(rawStr)) {
        const content = stripBoxBorder(rawStr);
        if (content) {
          lines.push(content);
          if (!firstMeta) firstMeta = meta;
        }
      }
      return;
    }

    if (inBox) {
      if (hasEnd) {
        if (!isBoxSeparator(rawStr)) {
          const content = stripBoxBorder(rawStr);
          if (content) {
            lines.push(content);
            if (!firstMeta) firstMeta = meta;
          }
        }
        flush();
        return;
      }

      if (hasBoxChar) {
        if (isBoxSeparator(rawStr)) {
          return;
        }
        const content = stripBoxBorder(rawStr);
        if (!firstMeta) firstMeta = meta;
        lines.push(content);
        return;
      }

      // A normal line flushes the open group
      flush();
    }

    // Normal line not in box
    if (isBoxSeparator(rawStr)) return;
    onFlush({
      message: stripAnsi(rawStr),
      level: meta?.level || 'log',
      meta,
    });
  };

  const feed = (rawArg, meta) => {
    const rawStr = String(rawArg ?? '');
    const splitLines = rawStr.split(/\r?\n/);
    for (const line of splitLines) {
      feedOneLine(line, meta);
    }
  };

  return { feed, flush };
}
