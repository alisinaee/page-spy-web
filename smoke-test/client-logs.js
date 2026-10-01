import {
  buildCurlCommand,
  redactSecrets,
  createBoxLineGrouper,
  isBoxSeparator,
  stripAnsi,
  stripBoxBorder,
} from './log-format.js?v=10';
import { buildRouteTrace, routeWindow } from './route-trace.js?v=10';
import { formatTehranDateTime, formatTehranStamp } from './tehran-time.js?v=10';

(() => {
  const logs = [];
  const textLimit = 12000;
  const MAX_ENTRIES = 2000;
  const sectionCounts = {};
  const subscribers = new Set();
  let refreshOpenViewer = null;

  const removeSection = (section) => {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].section === section) logs.splice(i, 1);
    }
    sectionCounts[section] = 0;
  };

  // Spy Tobank design tokens. Same values as the panel; prefixed so they never
  // collide with the host page. This is the only place hex colors live.
  const TOKENS_CSS =
    ':root{' +
    '--spyt-bg:#0b0d12;--spyt-card:#12151c;--spyt-popover:#181c25;--spyt-muted:#1f2430;' +
    '--spyt-border:#5c6b86;--spyt-input:#5c6b86;--spyt-fg:#e7e9ee;--spyt-muted-fg:#9aa3b2;' +
    '--spyt-primary:#e10613;--spyt-primary-fg:#ffffff;--spyt-primary-text:#ff8a8a;' +
    '--spyt-success:#22c55e;--spyt-warning:#f59e0b;--spyt-destructive:#f87171;--spyt-info:#38bdf8;' +
    '--spyt-ring:#ff8a8a;--spyt-warning-bg:rgba(245,158,11,.10);--spyt-destructive-bg:rgba(248,113,113,.10);' +
    '--spyt-scrim:rgba(0,0,0,.6);--spyt-shadow:0 8px 24px rgba(0,0,0,.4);' +
    '--spyt-radius:8px;--spyt-radius-lg:12px;' +
    '--spyt-font:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
    '--spyt-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}';

  const ensureTokens = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('spy-tobank-tokens')) return;
    const style = document.createElement('style');
    style.id = 'spy-tobank-tokens';
    style.textContent = TOKENS_CSS;
    (document.head || document.documentElement).append(style);
  };
  ensureTokens();

  // Shared by the settings card and the save dialog (rendered inside each overlay
  // so it also works when the overlay lives in a shadow root).
  const DIALOG_CSS = [
    '.spyt-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;width:100%;height:100dvh;max-width:none;max-height:none;margin:0;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom));border:none;overflow:hidden;box-sizing:border-box;background:var(--spyt-scrim);color:var(--spyt-fg);font:14px/1.45 var(--spyt-font)}',
    '.spyt-overlay *{box-sizing:border-box}',
    '.spyt-card{width:min(440px,100%);max-height:85dvh;overflow:auto;margin:0;padding:16px;background:var(--spyt-popover);color:var(--spyt-fg);border:1px solid var(--spyt-border);border-radius:var(--spyt-radius-lg);box-shadow:var(--spyt-shadow)}',
    '.spyt-title{margin:0 0 12px;font-size:16px;font-weight:600}',
    '.spyt-label{display:block;font-size:12px;color:var(--spyt-muted-fg)}',
    '.spyt-input{display:block;width:100%;min-height:44px;margin:8px 0 16px;padding:0 12px;border:1px solid var(--spyt-input);border-radius:var(--spyt-radius);background:var(--spyt-bg);color:var(--spyt-fg);font:16px var(--spyt-font)}',
    '.spyt-input:focus{outline:2px solid var(--spyt-ring);outline-offset:1px}',
    '.spyt-actions{display:flex;gap:8px}',
    '.spyt-btn{flex:1;min-height:44px;padding:0 16px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:transparent;color:var(--spyt-fg);font:14px var(--spyt-font);cursor:pointer}',
    '.spyt-btn-primary{background:var(--spyt-primary);border-color:var(--spyt-primary);color:var(--spyt-primary-fg)}',
    '.spyt-btn:focus-visible,.spyt-overlay button:focus-visible{outline:2px solid var(--spyt-ring);outline-offset:2px}',
  ].join('');

  const clip = (value) => {
    const text = String(value ?? '');
    return text.length > textLimit
      ? text.slice(0, textLimit) + '\n…truncated'
      : text;
  };

  const asText = (value) => {
    if (typeof value === 'string') return clip(value);
    try {
      return clip(JSON.stringify(value));
    } catch (error) {
      return clip(String(value));
    }
  };

  const SETTINGS_KEY = 'pagespy_capture_settings';
  const ALL_CONSOLE_LEVELS = ['log', 'info', 'warn', 'error', 'debug'];
  const ALL_NETWORK_KINDS = [
    'Fetch/XHR',
    'CSS',
    'JS',
    'Img',
    'Socket',
    'Other',
  ];

  const defaultSettings = () => ({
    masterLogs: true,
    pageSnapshots: true,
    consoleLevels: [...ALL_CONSOLE_LEVELS],
    disabledTags: [],
    networkKinds: [...ALL_NETWORK_KINDS],
  });

  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      const parsed = JSON.parse(raw);
      return {
        masterLogs: parsed.masterLogs !== false,
        pageSnapshots: parsed.pageSnapshots !== false,
        consoleLevels: Array.isArray(parsed.consoleLevels)
          ? parsed.consoleLevels
          : [...ALL_CONSOLE_LEVELS],
        disabledTags: Array.isArray(parsed.disabledTags)
          ? parsed.disabledTags
          : [],
        networkKinds: Array.isArray(parsed.networkKinds)
          ? parsed.networkKinds
          : [...ALL_NETWORK_KINDS],
      };
    } catch (e) {
      return defaultSettings();
    }
  };

  let currentSettings = loadSettings();

  const saveSettings = (newSettings) => {
    currentSettings = { ...currentSettings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (e) {}
  };

  const record = (entry) => {
    if (!currentSettings.masterLogs) return;
    if (
      entry.section === 'console' &&
      isBoxSeparator(String(entry.message || ''))
    ) {
      return;
    }
    if (entry.section === 'console') {
      if (entry.level && !currentSettings.consoleLevels.includes(entry.level)) {
        return;
      }
      const tagMatches = String(entry.message || '').match(/\[([A-Z0-9_]+)\]/g);
      if (tagMatches) {
        const hasDisabledTag = tagMatches.some((t) =>
          currentSettings.disabledTags.includes(t.slice(1, -1)),
        );
        if (hasDisabledTag) return;
      }
    }
    if (entry.section === 'network') {
      const kind = entry.kind || 'Other';
      if (!currentSettings.networkKinds.includes(kind)) {
        return;
      }
    }
    const stored = { time: new Date().toISOString(), ...entry };
    logs.push(stored);
    const section = stored.section;
    sectionCounts[section] = (sectionCounts[section] || 0) + 1;
    if (sectionCounts[section] > MAX_ENTRIES) {
      const oldest = logs.findIndex((item) => item.section === section);
      if (oldest >= 0) {
        logs.splice(oldest, 1);
        sectionCounts[section] -= 1;
      }
    }
    subscribers.forEach((notify) => {
      try {
        notify(stored);
      } catch (e) {}
    });
    if (stored.section === 'console') scheduleRouteMarkers();
  };

  let forwardConsole = null;
  let routeEmitTimer = null;
  const emittedRouteKeys = new Set();
  const routeEntries = () => {
    const entries = [];
    logs.forEach((item, index) => {
      if (item.section !== 'console') return;
      entries.push({
        index,
        time: item.time ? new Date(item.time).getTime() : 0,
        text: item.message || '',
      });
    });
    return entries;
  };
  const flushRouteMarkers = () => {
    if (typeof forwardConsole !== 'function') return;
    buildRouteTrace(routeEntries()).forEach((node) => {
      const key = [
        node.time,
        node.operation,
        node.kind,
        node.address,
        node.name,
        node.jsonUrl,
      ].join('|');
      if (emittedRouteKeys.has(key)) return;
      emittedRouteKeys.add(key);
      forwardConsole(
        [
          '[ROUTE]',
          node.operation,
          node.kind,
          node.name || '',
          node.address || '',
          node.jsonUrl || '',
          String(node.time || 0),
        ].join('\x1f'),
      );
    });
  };
  const scheduleRouteMarkers = () => {
    if (routeEmitTimer) return;
    routeEmitTimer = setTimeout(() => {
      routeEmitTimer = null;
      flushRouteMarkers();
    }, 400);
  };

  const describeRequestBody = async (body) => {
    if (body == null || body === '') return '';
    if (typeof body === 'string') return body;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      const fields = [];
      body.forEach((value, key) => {
        if (typeof value === 'string') fields.push([key, value]);
        else {
          fields.push([
            key,
            `(file name=${value.name || ''} type=${value.type || ''} size=${
              value.size || 0
            })`,
          ]);
        }
      });
      return fields;
    }
    if (
      typeof URLSearchParams !== 'undefined' &&
      body instanceof URLSearchParams
    ) {
      return Array.from(body.entries());
    }
    let bytes = null;
    if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
    else if (ArrayBuffer.isView(body)) {
      bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
      const media = body.type && /^(image|video|audio)\//.test(body.type);
      if (media || body.size > 2097152) {
        return `(file name=${body.name || ''} type=${body.type || ''} size=${
          body.size
        })`;
      }
      try {
        return await body.text();
      } catch (error) {
        return `[binary ${body.size} bytes]`;
      }
    }
    if (!bytes) return '[binary body]';
    if (!bytes.length) return '';
    if (bytes.length > 2097152) return `[binary ${bytes.length} bytes]`;
    const sample = bytes.subarray(0, Math.min(bytes.length, 2048));
    let weird = 0;
    for (let index = 0; index < sample.length; index += 1) {
      const byte = sample[index];
      if (byte === 9 || byte === 10 || byte === 13) continue;
      if (byte < 32) weird += 1;
    }
    if (sample.length && weird / sample.length >= 0.05) {
      return `[binary ${bytes.length} bytes]`;
    }
    return new TextDecoder('utf-8').decode(bytes);
  };

  const absoluteUrl = (url) => {
    const raw = String(url || '');
    if (!raw || /^(https?:|wss?:|data:|blob:)/i.test(raw)) return raw;
    try {
      return new URL(raw, location.href).href;
    } catch (error) {
      return raw;
    }
  };

  const describeXhrResponse = async (xhr) => {
    let type = '';
    try {
      type = xhr.getResponseHeader('content-type') || '';
    } catch (error) {
      type = '';
    }
    const binary =
      /^(image|video|audio|font)\//.test(type) || type.includes('octet-stream');
    if (binary) return `[${type}]`;
    if (xhr.responseType === 'arraybuffer' || xhr.responseType === 'blob') {
      const described = await describeRequestBody(xhr.response);
      if (described) return described;
      return '[' + (type || xhr.responseType || 'binary') + ']';
    }
    if (xhr.responseType === 'json') {
      if (xhr.response != null && xhr.response !== '') return xhr.response;
      return type ? '[' + type + ']' : '';
    }
    try {
      if (typeof xhr.responseText === 'string' && xhr.responseText)
        return xhr.responseText;
    } catch (error) {
      return type ? '[' + type + ']' : '';
    }
    return type ? '[' + type + ']' : '';
  };

  const classifyKind = (url, fallback = 'Fetch/XHR') => {
    if (!url) return fallback;
    const clean = url.split('?')[0].split('#')[0].toLowerCase();
    if (clean.startsWith('ws:') || clean.startsWith('wss:')) return 'Socket';
    if (clean.endsWith('.css')) return 'CSS';
    if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'JS';
    if (/\.(png|jpe?g|gif|svg|webp|ico|bmp|avif)$/.test(clean)) return 'Img';
    return fallback;
  };

  let installed = false;
  const replayEarlyLogs = () => {
    const early = window.__pageSpyEarlyLogs || [];
    window.__pageSpyEarlyLogs = [];
    early.forEach((item) => {
      const args = item.args || [];
      const rawMessage = args.map(asText).join(' ');
      record({
        section: 'console',
        level: item.level || 'log',
        args,
        message: clip(stripAnsi(rawMessage)),
        time: item.time ? new Date(item.time).toISOString() : undefined,
      });
    });
  };
  const install = () => {
    if (installed) return;
    installed = true;
    replayEarlyLogs();

    let boxTimer = null;
    const grouper = createBoxLineGrouper((item) => {
      if (boxTimer) {
        clearTimeout(boxTimer);
        boxTimer = null;
      }
      record({
        section: 'console',
        level: item.level || 'log',
        message: clip(stripBoxBorder(stripAnsi(item.message))),
        args: item.meta?.args || [item.message],
      });
    });

    ['debug', 'info', 'log', 'warn', 'error'].forEach((level) => {
      const current = console[level];
      const original =
        current && current.__pageSpyOriginal
          ? current.__pageSpyOriginal
          : current.bind(console);
      if (level === 'log') forwardConsole = original;
      console[level] = (...args) => {
        const safeArgs = args.map((item) => {
          if (item == null || typeof item !== 'object') return item;
          try {
            return JSON.parse(JSON.stringify(item));
          } catch (error) {
            return String(item);
          }
        });

        const rawMessage = args.map(asText).join(' ');
        const hasBox = /[┌┐└┘│├┤┬┴┼─]/.test(rawMessage);

        if (hasBox) {
          const lines = rawMessage.split(/\r?\n/);
          for (const line of lines) {
            grouper.feed(line, { level, args: safeArgs });
          }
          if (/[└┘]/.test(rawMessage)) {
            grouper.flush();
          } else {
            if (boxTimer) clearTimeout(boxTimer);
            boxTimer = setTimeout(() => {
              grouper.flush();
            }, 600);
          }
        } else {
          if (boxTimer) {
            clearTimeout(boxTimer);
            boxTimer = null;
          }
          grouper.flush();
          record({
            section: 'console',
            level,
            args: safeArgs,
            message: clip(stripAnsi(rawMessage)),
          });
        }

        original(...args);
      };
    });

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const input = args[0];
      const init = args[1] || {};
      const url = absoluteUrl(
        typeof input === 'string' ? input : input && input.url,
      );
      const method = String(
        init.method || (input && input.method) || 'GET',
      ).toUpperCase();
      const requestHeaders = [];
      try {
        const headers = new Headers(
          init.headers ||
            (typeof input !== 'string' && input && input.headers) ||
            undefined,
        );
        headers.forEach((value, key) => requestHeaders.push([key, value]));
      } catch (error) {}
      let requestBody = '';
      if (typeof init.body === 'string') {
        try {
          requestBody = JSON.parse(init.body);
        } catch (error) {
          requestBody = clip(init.body);
        }
      } else if (init.body) {
        requestBody = await describeRequestBody(init.body);
      }
      try {
        const response = await originalFetch(...args);
        const contentType = response.headers.get('content-type') || '';
        let responseBody = '';
        if (/json|text|javascript|xml|svg/.test(contentType)) {
          const raw = await response.clone().text();
          if (contentType.includes('json')) {
            try {
              responseBody = JSON.parse(raw);
            } catch (error) {
              responseBody = clip(raw);
            }
          } else {
            responseBody = clip(raw);
          }
        } else {
          responseBody = '[' + (contentType || 'binary') + ']';
        }
        record({
          section: 'network',
          kind: classifyKind(url, 'Fetch/XHR'),
          method,
          url,
          status: response.status,
          ok: response.ok,
          requestHeaders,
          requestBody,
          responseBody,
        });
        return response;
      } catch (error) {
        record({
          section: 'network',
          kind: classifyKind(url, 'Fetch/XHR'),
          method,
          url,
          status: 'failed',
          ok: false,
          requestHeaders,
          requestBody,
          error: error && error.message,
        });
        throw error;
      }
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function open(method, url) {
      this.__psLog = {
        method: String(method || 'GET').toUpperCase(),
        url: String(url || ''),
        headers: [],
        started: 0,
      };
      return originalOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function setRequestHeader(
      name,
      value,
    ) {
      if (this.__psLog) this.__psLog.headers.push([name, value]);
      return originalSetHeader.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function send(body) {
      const meta = this.__psLog || {
        method: 'GET',
        url: '',
        headers: [],
        started: Date.now(),
      };
      meta.started = Date.now();
      const xhr = this;
      xhr.addEventListener('loadend', async () => {
        let requestBody = '';
        try {
          requestBody = await describeRequestBody(body);
        } catch (error) {
          requestBody = '[binary body]';
        }
        let responseBody = '';
        try {
          responseBody = await describeXhrResponse(xhr);
        } catch (error) {
          responseBody = '';
        }
        record({
          section: 'network',
          kind: classifyKind(meta.url, 'Fetch/XHR'),
          method: meta.method,
          url: absoluteUrl(meta.url),
          status: xhr.status || 'failed',
          ok: xhr.status >= 200 && xhr.status < 400,
          costTime: Date.now() - meta.started,
          requestHeaders: meta.headers,
          requestBody,
          responseBody,
        });
      });
      return originalSend.apply(this, arguments);
    };
    scheduleRouteMarkers();
  };

  const storageEntries = (storage) => {
    const entries = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      entries.push({ name: key, value: storage.getItem(key) });
    }
    return entries;
  };

  const browserName = () => {
    const agent = navigator.userAgent;
    if (agent.includes('Edg/')) return 'Edge';
    if (agent.includes('Chrome/')) return 'Chrome';
    if (agent.includes('Safari/')) return 'Safari';
    if (agent.includes('Firefox/')) return 'Firefox';
    return 'Browser';
  };

  const deviceInfo = () => {
    const spy = window.$pageSpy;
    const address = (spy && spy.address) || 'unknown';
    let project = 'device';
    try {
      project = (spy && spy.config && spy.config.get().project) || project;
    } catch (error) {
      project = 'device';
    }
    return {
      id: address,
      shortId: String(address).slice(0, 4),
      project,
      title: document.title || '--',
      url: location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: screen.width + 'x' + screen.height,
      browser: browserName(),
    };
  };

  const snapshot = () => {
    const device = deviceInfo();
    return {
      exportedAt: formatTehranDateTime(new Date()),
      deviceId: device.id,
      device,
      console: logs.filter((item) => item.section === 'console'),
      network: logs
        .filter((item) => item.section === 'network')
        .map((item) => ({
          ...item,
          url: absoluteUrl(item.url),
        })),
      routes: buildRouteTrace(routeEntries()),
      page: { title: document.title, href: location.href },
      storage: {
        localStorage: storageEntries(localStorage),
        sessionStorage: storageEntries(sessionStorage),
        cookie: document.cookie,
      },
      system: {
        userAgent: device.userAgent,
        platform: device.platform,
        language: device.language,
        screen: device.screen,
        browser: device.browser,
      },
    };
  };

  const cleanPart = (value, fallback) =>
    String(value || fallback)
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || fallback;

  const defaultFileName = () => {
    const device = deviceInfo();
    const stamp = formatTehranStamp(new Date());
    return (
      [
        'pagespy',
        'all',
        cleanPart(device.project, 'project'),
        cleanPart(device.shortId, 'device'),
        cleanPart(device.platform, 'os'),
        cleanPart(device.browser, 'browser'),
        stamp,
      ].join('_') + '.json'
    );
  };

  const saveBlob = (fileName, payload) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.endsWith('.json')
      ? fileName
      : fileName + '.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const askFileName = (initialName) =>
    new Promise((resolve) => {
      ensureTokens();
      const overlay = document.createElement('div');
      overlay.className = 'spyt-overlay';
      overlay.innerHTML =
        '<style>' +
        DIALOG_CSS +
        '</style>' +
        '<form class="spyt-card">' +
        '<div class="spyt-title">Save logs</div>' +
        '<label class="spyt-label">File name' +
        '<input class="spyt-input" name="fileName" autocomplete="off" />' +
        '</label>' +
        '<div class="spyt-actions">' +
        '<button type="button" class="spyt-btn" data-cancel>Cancel</button>' +
        '<button type="submit" class="spyt-btn spyt-btn-primary">Save</button>' +
        '</div></form>';
      const input = overlay.querySelector('input');
      input.value = initialName;
      const close = (value) => {
        try {
          if (typeof overlay.hidePopover === 'function') {
            overlay.hidePopover();
          }
        } catch (e) {}
        overlay.remove();
        resolve(value);
      };
      overlay.querySelector('[data-cancel]').onclick = () => close(null);
      overlay.onsubmit = (event) => {
        event.preventDefault();
        close(input.value.trim() || initialName);
      };

      const host = document.getElementById('__pageSpy');
      if (typeof overlay.showPopover === 'function') {
        overlay.setAttribute('popover', 'manual');
        overlay.style.zIndex = '2147483647';
        document.body.appendChild(overlay);
        try {
          overlay.showPopover();
        } catch (e) {}
      } else if (host && host.shadowRoot) {
        overlay.style.zIndex = '20000';
        host.shadowRoot.appendChild(overlay);
      } else {
        overlay.style.zIndex = '2147483647';
        document.body.appendChild(overlay);
      }
      input.focus();
      input.select();
    });

  const pretty = (value) => {
    if (value == null || value === '') return '';
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch (error) {
        return value;
      }
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  };

  const deepen = (value, depth = 0) => {
    if (depth > 5 || value == null) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (
        (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
        trimmed.length > 1
      ) {
        try {
          return deepen(JSON.parse(trimmed), depth + 1);
        } catch (error) {
          return value;
        }
      }
      return value;
    }
    if (Array.isArray(value))
      return value.map((item) => deepen(item, depth + 1));
    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          deepen(item, depth + 1),
        ]),
      );
    }
    return value;
  };

  const addToken = (parent, value, kind) => {
    const token = document.createElement('span');
    token.className = 'j-' + kind;
    token.textContent = value;
    parent.append(token);
  };

  const writeJson = (parent, value, indent, counter) => {
    const budget = counter || { count: 0, marked: false };
    if (budget.count >= 5000) {
      if (!budget.marked) {
        budget.marked = true;
        addToken(parent, '… (truncated)', 'punct');
      }
      return;
    }
    budget.count += 1;
    const pad = '  '.repeat(indent);
    if (value === null) return addToken(parent, 'null', 'nil');
    if (typeof value === 'boolean')
      return addToken(parent, String(value), 'bool');
    if (typeof value === 'number')
      return addToken(parent, String(value), 'num');
    if (typeof value === 'string')
      return addToken(parent, JSON.stringify(value), 'str');
    if (Array.isArray(value)) {
      if (!value.length) return addToken(parent, '[]', 'punct');
      addToken(parent, '[\n', 'punct');
      value.forEach((item, index) => {
        addToken(parent, pad + '  ', 'punct');
        writeJson(parent, item, indent + 1, budget);
        addToken(parent, index === value.length - 1 ? '\n' : ',\n', 'punct');
      });
      addToken(parent, pad + ']', 'punct');
      return;
    }
    const entries = Object.entries(value);
    if (!entries.length) return addToken(parent, '{}', 'punct');
    addToken(parent, '{\n', 'punct');
    entries.forEach(([key, item], index) => {
      addToken(parent, pad + '  ', 'punct');
      addToken(parent, JSON.stringify(key), 'key');
      addToken(parent, ': ', 'punct');
      writeJson(parent, item, indent + 1, budget);
      addToken(parent, index === entries.length - 1 ? '\n' : ',\n', 'punct');
    });
    addToken(parent, pad + '}', 'punct');
  };

  const jsonBlock = (value) => {
    const block = document.createElement('pre');
    const deepened = deepen(value);
    if (deepened == null || deepened === '') {
      block.textContent = 'None';
      return block;
    }
    writeJson(block, deepened, 0);
    return block;
  };

  const copyText = (text, done) => {
    const fallback = () => {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (done) done(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => done && done(true))
        .catch(fallback);
    } else {
      fallback();
    }
  };

  const curlText = (item) =>
    buildCurlCommand({
      url: absoluteUrl(item.url),
      method: item.method,
      requestHeader: item.requestHeaders,
      requestPayload: item.requestBody,
    });

  const responsePlain = (value) => {
    const deepened = deepen(value);
    if (deepened == null || deepened === '') return '(empty)';
    if (typeof deepened === 'string') {
      const trimmed = deepened.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.stringify(JSON.parse(trimmed), null, 2);
        } catch (error) {
          return deepened;
        }
      }
      return deepened;
    }
    try {
      return JSON.stringify(deepened, null, 2);
    } catch (error) {
      return String(deepened);
    }
  };

  const fullNetworkText = (item) => {
    const status =
      item.status == null || item.status === '' ? '' : String(item.status);
    const lines = [curlText(item), ''];
    if (status) lines.push('# Status', status, '');
    lines.push('# Response', responsePlain(item.error || item.responseBody));
    return lines.join('\n');
  };

  const syncMasterButtons = () => {
    const label = currentSettings.masterLogs ? 'Logs ON' : 'Logs OFF';
    const modal =
      window.$pageSpy &&
      window.$pageSpy.constructor &&
      window.$pageSpy.constructor.modal;
    const toggle =
      modal &&
      modal.root &&
      modal.root.querySelector('#page-spy-logs-toggle input');
    if (toggle) toggle.checked = currentSettings.masterLogs;
  };

  const toggleMaster = () => {
    const next = !currentSettings.masterLogs;
    saveSettings({ masterLogs: next });
    syncMasterButtons();
    return next;
  };

  const mountSettingsOverlay = (overlay) => {
    ensureTokens();
    overlay.classList.add('pagespy-settings');
    const style = document.createElement('style');
    style.textContent = [
      DIALOG_CSS,
      '.pagespy-settings h2{margin:0;font-size:16px;font-weight:600}',
      '.pagespy-settings h4{margin:16px 0 8px;font-size:12px;font-weight:600;color:var(--spyt-muted-fg)}',
      '.pagespy-settings .settings-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}',
      '.pagespy-settings .settings-row{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;padding:4px 0;border-bottom:1px solid var(--spyt-border)}',
      '.pagespy-settings .settings-switch,.pagespy-settings .chip{min-height:44px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:transparent;color:var(--spyt-fg);font:14px var(--spyt-font);cursor:pointer}',
      '.pagespy-settings .settings-switch{min-width:72px;padding:0 14px;font-weight:600}',
      '.pagespy-settings .settings-switch[data-on="true"]{background:var(--spyt-primary);border-color:var(--spyt-primary);color:var(--spyt-primary-fg)}',
      '.pagespy-settings .settings-chips{display:flex;flex-wrap:wrap;gap:8px}',
      '.pagespy-settings .chip{padding:0 12px}',
      '.pagespy-settings .chip[data-active="true"]{background:var(--spyt-primary);border-color:var(--spyt-primary);color:var(--spyt-primary-fg)}',
      '.pagespy-settings .chip[data-active="true"]::before{content:"✓ "}',
      '.pagespy-settings .settings-empty{font-size:12px;color:var(--spyt-muted-fg)}',
    ].join('');
    overlay.prepend(style);
    const close = () => {
      try {
        if (typeof overlay.hidePopover === 'function') overlay.hidePopover();
      } catch (e) {}
      overlay.remove();
    };
    overlay.dataset.closeSettings = '1';
    overlay.__closeSettings = close;
    if (typeof overlay.showPopover === 'function') {
      overlay.setAttribute('popover', 'manual');
      document.body.append(overlay);
      try {
        overlay.showPopover();
        return;
      } catch (e) {}
    }
    document.body.append(overlay);
  };

  const openSettings = () => {
    const existing = document.querySelector('.pagespy-settings');
    if (existing) {
      if (existing.__closeSettings) existing.__closeSettings();
      else existing.remove();
    }
    const overlay = document.createElement('div');
    overlay.className = 'spyt-overlay';
    const card = document.createElement('div');
    card.className = 'settings-card spyt-card';
    const header = document.createElement('div');
    header.className = 'settings-head';
    const title = document.createElement('h2');
    title.textContent = 'Capture Settings';
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'chip';
    doneBtn.dataset.active = 'false';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = () => {
      if (overlay.__closeSettings) overlay.__closeSettings();
    };
    header.append(title, doneBtn);
    card.append(header);

    const masterRow = document.createElement('div');
    masterRow.className = 'settings-row';
    const masterLabel = document.createElement('span');
    masterLabel.textContent = 'Master Logs Capture';
    const masterSwitch = document.createElement('button');
    masterSwitch.type = 'button';
    masterSwitch.className = 'settings-switch';
    masterSwitch.dataset.on = String(currentSettings.masterLogs);
    masterSwitch.textContent = currentSettings.masterLogs ? 'ON' : 'OFF';
    masterSwitch.onclick = () => {
      const next = toggleMaster();
      masterSwitch.dataset.on = String(next);
      masterSwitch.textContent = next ? 'ON' : 'OFF';
    };
    masterRow.append(masterLabel, masterSwitch);
    card.append(masterRow);

    const pageRow = document.createElement('div');
    pageRow.className = 'settings-row';
    const pageLabel = document.createElement('span');
    pageLabel.textContent = 'Page Snapshots Capture';
    const pageSwitch = document.createElement('button');
    pageSwitch.type = 'button';
    pageSwitch.className = 'settings-switch';
    pageSwitch.dataset.on = String(currentSettings.pageSnapshots);
    pageSwitch.textContent = currentSettings.pageSnapshots ? 'ON' : 'OFF';
    pageSwitch.onclick = () => {
      const next = !currentSettings.pageSnapshots;
      saveSettings({ pageSnapshots: next });
      pageSwitch.dataset.on = String(next);
      pageSwitch.textContent = next ? 'ON' : 'OFF';
    };
    pageRow.append(pageLabel, pageSwitch);
    card.append(pageRow);

    const consoleLevelHeading = document.createElement('h4');
    consoleLevelHeading.textContent = 'Console Capture Levels';
    const levelChips = document.createElement('div');
    levelChips.className = 'settings-chips';
    ALL_CONSOLE_LEVELS.forEach((lvl) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.active = String(currentSettings.consoleLevels.includes(lvl));
      chip.textContent = lvl;
      chip.onclick = () => {
        let nextLevels = [...currentSettings.consoleLevels];
        if (nextLevels.includes(lvl))
          nextLevels = nextLevels.filter((l) => l !== lvl);
        else nextLevels.push(lvl);
        saveSettings({ consoleLevels: nextLevels });
        chip.dataset.active = String(nextLevels.includes(lvl));
      };
      levelChips.append(chip);
    });
    card.append(consoleLevelHeading, levelChips);

    const consoleTagHeading = document.createElement('h4');
    consoleTagHeading.textContent = 'Console Capture Tags';
    const tagChips = document.createElement('div');
    tagChips.className = 'settings-chips';
    const seenTags = new Set();
    logs.forEach((it) => {
      if (it.section === 'console') {
        const matches = String(it.message || '').match(/\[([A-Z0-9_]+)\]/g);
        if (matches) matches.forEach((t) => seenTags.add(t.slice(1, -1)));
      }
    });
    currentSettings.disabledTags.forEach((t) => seenTags.add(t));
    if (seenTags.size === 0) {
      const noTags = document.createElement('span');
      noTags.className = 'settings-empty';
      noTags.textContent = 'No tags detected yet';
      tagChips.append(noTags);
    } else {
      seenTags.forEach((tag) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        const isEnabled = !currentSettings.disabledTags.includes(tag);
        chip.dataset.active = String(isEnabled);
        chip.textContent = `[${tag}]`;
        chip.onclick = () => {
          let nextDisabled = [...currentSettings.disabledTags];
          if (nextDisabled.includes(tag))
            nextDisabled = nextDisabled.filter((t) => t !== tag);
          else nextDisabled.push(tag);
          saveSettings({ disabledTags: nextDisabled });
          chip.dataset.active = String(!nextDisabled.includes(tag));
        };
        tagChips.append(chip);
      });
    }
    card.append(consoleTagHeading, tagChips);

    const netKindHeading = document.createElement('h4');
    netKindHeading.textContent = 'Network Kinds to Capture';
    const netChips = document.createElement('div');
    netChips.className = 'settings-chips';
    ALL_NETWORK_KINDS.forEach((kind) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.active = String(currentSettings.networkKinds.includes(kind));
      chip.textContent = kind;
      chip.onclick = () => {
        let nextKinds = [...currentSettings.networkKinds];
        if (nextKinds.includes(kind))
          nextKinds = nextKinds.filter((k) => k !== kind);
        else nextKinds.push(kind);
        saveSettings({ networkKinds: nextKinds });
        chip.dataset.active = String(nextKinds.includes(kind));
      };
      netChips.append(chip);
    });
    card.append(netKindHeading, netChips);

    overlay.onclick = (event) => {
      if (event.target === overlay && overlay.__closeSettings)
        overlay.__closeSettings();
    };
    overlay.append(card);
    mountSettingsOverlay(overlay);
  };

  const VIEWER_PAGE = 50;
  const VIEWER_MAX_DOM = 400;
  const LEVEL_GLYPH = {
    log: '•',
    info: 'ℹ',
    warn: '▲',
    error: '✕',
    debug: '◆',
  };

  const VIEWER_CSS = (() => {
    const V = '#pagespy-log-viewer';
    const rule = (selectors, body) =>
      selectors
        .split(',')
        .map((s) => (s.startsWith('@root') ? V + s.slice(5) : V + ' ' + s))
        .join(',') +
      '{' +
      body +
      '}';
    return [
      rule(
        '@root',
        'position:fixed;inset:0;z-index:2147483646;width:100%;max-width:100%;min-width:0;height:100dvh;margin:0;overflow:hidden;display:flex;flex-direction:column;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);background:var(--spyt-bg);color:var(--spyt-fg);font:14px/1.45 var(--spyt-font);-webkit-tap-highlight-color:transparent',
      ),
      rule('*', 'box-sizing:border-box'),
      rule('[hidden]', 'display:none!important'),
      rule('button,input', 'font:inherit;margin:0'),
      rule(
        'button:focus-visible,input:focus-visible',
        'outline:2px solid var(--spyt-ring);outline-offset:2px',
      ),
      rule(
        '.btn',
        'min-height:34px;padding:0 10px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:transparent;color:var(--spyt-fg);font-size:13px;cursor:pointer',
      ),
      rule(
        '.icon-btn',
        'width:36px;height:36px;min-height:36px;padding:0;display:flex;align-items:center;justify-content:center;flex:none;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:transparent;color:var(--spyt-fg);cursor:pointer',
      ),
      rule('.search-nav', 'display:flex;align-items:center;gap:2px'),
      rule(
        '.search-nav .icon-btn',
        'border:0;background:transparent;width:32px;height:32px;min-height:32px',
      ),
      rule(
        '.search-count',
        'min-width:3.2em;text-align:center;font:12px var(--spyt-mono);color:var(--spyt-muted-fg)',
      ),
      rule(
        '.route-map',
        'display:flex;flex-direction:column;padding:8px 12px 16px',
      ),
      rule('.route-node', 'display:flex;gap:10px;padding:8px 0'),
      rule(
        '.route-rail',
        'display:flex;flex-direction:column;align-items:center;width:14px;flex:none',
      ),
      rule(
        '.route-dot',
        'width:12px;height:12px;border-radius:999px;background:var(--spyt-primary);flex:none',
      ),
      rule(
        '.route-dot[data-kind="dialog"],.route-dot[data-kind="sheet"]',
        'background:#e8b931',
      ),
      rule(
        '.route-line',
        'width:1px;flex:1;background:var(--spyt-border);min-height:12px',
      ),
      rule(
        '.route-body',
        'min-width:0;flex:1;display:flex;flex-direction:column;gap:8px;align-items:stretch',
      ),
      rule('.route-actions', 'display:flex;flex-wrap:wrap;gap:6px'),
      rule(
        '.route-actions .btn',
        'min-height:32px;padding:0 8px;font-size:12px',
      ),
      rule('.route-copy', 'min-width:0;flex:1'),
      rule(
        '.route-copy strong',
        'display:block;font-size:14px;font-weight:600',
      ),
      rule(
        '.route-meta',
        'font:12px var(--spyt-mono);color:var(--spyt-muted-fg);overflow-wrap:anywhere',
      ),
      rule(
        '.route-head',
        'display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--spyt-border);background:var(--spyt-card)',
      ),
      rule('.route-head .btn', 'flex:none'),
      rule(
        '.card[data-hit="current"],.pair[data-hit="current"]',
        'outline:2px solid var(--spyt-primary);outline-offset:-2px',
      ),
      rule(
        '.btn-danger,.clear-btn',
        'color:var(--spyt-destructive);border-color:var(--spyt-border)',
      ),
      rule(
        '.bar',
        'display:flex;align-items:center;gap:8px;padding:8px 12px;padding-top:max(8px,env(safe-area-inset-top));background:var(--spyt-card);border-bottom:1px solid var(--spyt-border)',
      ),
      rule('.bar strong', 'flex:1;font-size:16px;font-weight:600'),
      rule(
        '.tabs',
        'display:flex;flex:none;height:calc(46px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:var(--spyt-card);border-top:1px solid var(--spyt-border)',
      ),
      rule(
        '.tabs button',
        'position:relative;flex:1 1 0;min-width:0;min-height:46px;padding:6px 2px 0;border:0;border-radius:0;background:transparent;color:var(--spyt-muted-fg);font-size:11px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer',
      ),
      rule(
        '.tabs button[data-active="true"]',
        'background:transparent;color:var(--spyt-primary-text);font-weight:600',
      ),
      rule(
        '.tabs button[data-active="true"]::before',
        'content:"";position:absolute;top:0;left:12px;right:12px;height:2px;background:var(--spyt-primary)',
      ),
      rule(
        '.filters',
        'position:relative;flex:none;width:100%;max-width:100%;min-width:0;overflow:hidden;background:var(--spyt-card);border-bottom:1px solid var(--spyt-border)',
      ),
      rule(
        '.filter-row',
        'display:flex;flex-direction:row;direction:ltr;align-items:stretch;width:100%;max-width:100%;min-width:0;overflow:hidden',
      ),
      rule(
        '.filter-bar',
        'display:flex;flex:1 1 0%;width:0;min-width:0;flex-wrap:nowrap;gap:6px;padding:6px 8px;align-items:center;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;touch-action:pan-x;-webkit-overflow-scrolling:touch;scrollbar-width:thin',
      ),
      rule(
        '.filter-more',
        'flex:0 0 36px;width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;border:0;border-left:1px solid var(--spyt-border);background:var(--spyt-card);color:var(--spyt-fg);font-size:18px;line-height:1;cursor:pointer',
      ),
      rule(
        '.filter-menu',
        'position:fixed;z-index:2147483647;min-width:200px;max-width:min(280px,calc(100vw - 16px));max-height:min(60vh,420px);overflow:auto;padding:4px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:var(--spyt-popover);box-shadow:var(--spyt-shadow)',
      ),
      rule(
        '.filter-menu button',
        'display:flex;width:100%;min-height:36px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--spyt-fg);font-size:13px;text-align:left;cursor:pointer',
      ),
      rule('.chip,.clear-btn,.search-input,.filter-count', 'flex:0 0 auto'),
      rule(
        '.chip',
        'min-height:32px;padding:0 10px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:transparent;color:var(--spyt-fg);font-size:13px;cursor:pointer;user-select:none',
      ),
      rule(
        '.chip[data-active="true"]',
        'background:var(--spyt-primary);border-color:var(--spyt-primary);color:var(--spyt-primary-fg)',
      ),
      rule('.chip[data-active="true"]::before', 'content:"✓ "'),
      rule(
        '.clear-btn',
        'min-height:32px;padding:0 10px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:transparent;font-size:13px;cursor:pointer',
      ),
      rule(
        '.search-input',
        'width:160px;min-height:44px;padding:0 12px;border:1px solid var(--spyt-input);border-radius:var(--spyt-radius);background:var(--spyt-bg);color:var(--spyt-fg);font-size:16px',
      ),
      rule('.search-input::placeholder', 'color:var(--spyt-muted-fg)'),
      rule(
        '.filter-count',
        'font:12px var(--spyt-mono);color:var(--spyt-muted-fg)',
      ),
      rule(
        '.sheet',
        'flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:12px',
      ),
      rule(
        '.empty',
        'min-height:160px;display:flex;align-items:center;justify-content:center;color:var(--spyt-muted-fg);padding:24px',
      ),
      rule('.more', 'display:block;width:calc(100% - 24px);margin:8px 12px'),
      rule(
        '.card',
        'border-bottom:1px solid var(--spyt-border);background:var(--spyt-card);color:var(--spyt-fg)',
      ),
      rule('.card[data-level="info"]', 'color:var(--spyt-info)'),
      rule('.card[data-level="debug"]', 'color:var(--spyt-primary-text)'),
      rule(
        '.card[data-level="warn"]',
        'color:var(--spyt-warning);background:var(--spyt-warning-bg)',
      ),
      rule(
        '.card[data-level="error"]',
        'color:var(--spyt-destructive);background:var(--spyt-destructive-bg)',
      ),
      rule(
        '.log',
        'display:block;width:100%;min-height:34px;padding:0 0 0 10px;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;cursor:pointer',
      ),
      rule(
        '.net-row',
        'display:flex;align-items:stretch;width:100%;direction:ltr',
      ),
      rule(
        '.net',
        'flex:1;min-width:0;display:flex;flex-direction:column;align-items:stretch;gap:2px;min-height:34px;padding:6px 0 6px 10px;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;cursor:pointer',
      ),
      rule(
        '.net-meta',
        'display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:11px;line-height:1.3;color:var(--spyt-muted-fg)',
      ),
      rule('.line > .log', 'flex:1;width:auto;min-width:0'),
      rule('.row-actions', 'display:flex;gap:8px;padding:0 12px 10px'),
      rule(
        '.action',
        'min-height:32px;padding:0 10px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:var(--spyt-bg);color:var(--spyt-fg);font-size:13px;cursor:pointer',
      ),
      rule(
        '.line',
        'display:flex;align-items:center;gap:6px;width:100%;min-height:34px',
      ),
      rule(
        '.lvl',
        'flex:none;display:inline-flex;align-items:center;gap:4px;min-width:62px;font-size:12px;font-weight:600;text-transform:uppercase',
      ),
      rule(
        '.when',
        'flex:none;font:11px var(--spyt-mono);color:var(--spyt-muted-fg)',
      ),
      rule(
        '.sub',
        'display:block;padding:0 12px 6px 0;font:11px var(--spyt-mono);color:var(--spyt-muted-fg)',
      ),
      rule(
        '.preview',
        'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12px var(--spyt-mono)',
      ),
      rule(
        '.copy',
        'flex:none;min-width:40px;min-height:34px;padding:0 8px;border:0;border-left:1px solid var(--spyt-border);border-radius:0;background:transparent;color:var(--spyt-muted-fg);font-size:12px;cursor:pointer',
      ),
      rule(
        '.url',
        'display:block;width:100%;padding:0;overflow-wrap:anywhere;word-break:normal;font:13px/1.35 var(--spyt-mono);color:var(--spyt-fg)',
      ),
      rule('.net-row > .copy', 'align-self:center;margin-left:auto'),
      rule('.status', 'flex:none;font:600 12px var(--spyt-mono)'),
      rule('.status.ok', 'color:var(--spyt-success)'),
      rule('.status.bad', 'color:var(--spyt-destructive)'),
      rule(
        '.method',
        'flex:none;border:1px solid currentColor;border-radius:4px;padding:1px 6px;font:600 11px var(--spyt-mono);color:var(--spyt-info)',
      ),
      rule('.method[data-method="post"]', 'color:var(--spyt-success)'),
      rule(
        '.method[data-method="put"],.method[data-method="patch"]',
        'color:var(--spyt-warning)',
      ),
      rule('.method[data-method="delete"]', 'color:var(--spyt-destructive)'),
      rule(
        '.detail',
        'background:var(--spyt-bg);color:var(--spyt-fg);border-top:1px solid var(--spyt-border)',
      ),
      rule(
        '.detail h3',
        'margin:0;padding:10px 12px 0;font-size:12px;font-weight:600;color:var(--spyt-muted-fg);background:transparent',
      ),
      rule(
        'pre',
        'width:100%;margin:0;padding:8px 12px 12px;white-space:pre-wrap;word-break:break-word;background:transparent;color:var(--spyt-fg);font:12px/1.5 var(--spyt-mono)',
      ),
      rule(
        '.pair',
        'display:grid;grid-template-columns:minmax(96px,34%) minmax(0,1fr);gap:8px;align-items:center;width:100%;min-height:44px;padding:6px 12px;border-bottom:1px solid var(--spyt-border);background:var(--spyt-card)',
      ),
      rule('.pair span', 'color:var(--spyt-muted-fg);word-break:break-word'),
      rule(
        '.pair b',
        'font:12px var(--spyt-mono);font-weight:500;word-break:break-word',
      ),
      rule(
        'h3',
        'margin:0;padding:12px 12px 6px;font-size:12px;font-weight:600;color:var(--spyt-muted-fg);background:var(--spyt-bg)',
      ),
      rule('.j-key', 'color:var(--spyt-primary-text)'),
      rule('.j-str', 'color:var(--spyt-success)'),
      rule('.j-num', 'color:var(--spyt-info)'),
      rule('.j-bool', 'color:var(--spyt-warning)'),
      rule('.j-nil', 'color:var(--spyt-muted-fg)'),
      rule('.j-punct', 'color:var(--spyt-muted-fg)'),
      rule(
        '.floating-scroll-btn',
        'position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(58px + env(safe-area-inset-bottom));width:36px;height:36px;padding:0;border-radius:50%;background:var(--spyt-primary);color:var(--spyt-primary-fg);border:1px solid var(--spyt-primary);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:100',
      ),
      rule('.floating-scroll-btn svg', 'width:20px;height:20px'),
    ].join('');
  })();

  const openViewer = () => {
    if (
      typeof window !== 'undefined' &&
      window.$pageSpy &&
      window.$pageSpy.constructor &&
      window.$pageSpy.constructor.modal &&
      typeof window.$pageSpy.constructor.modal.close === 'function'
    ) {
      try {
        window.$pageSpy.constructor.modal.close();
      } catch (e) {}
    }

    ensureTokens();
    const data = snapshot();
    const existing = document.getElementById('pagespy-log-viewer');
    if (existing) {
      if (existing.__dispose) existing.__dispose();
      existing.remove();
    }
    const root = document.createElement('div');
    root.id = 'pagespy-log-viewer';
    const style = document.createElement('style');
    style.textContent = VIEWER_CSS;
    root.append(style);

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = '<strong>Spy Tobank logs</strong>';

    const glyph = (paths) =>
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      '</svg>';
    const iconBtn = (label, paths) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'icon-btn';
      button.setAttribute('aria-label', label);
      button.innerHTML = glyph(paths);
      return button;
    };
    const searchNav = document.createElement('div');
    searchNav.className = 'search-nav';
    searchNav.hidden = true;
    const searchPrev = iconBtn('Previous match', '<path d="M6 14l6-6 6 6"/>');
    const searchCount = document.createElement('span');
    searchCount.className = 'search-count';
    const searchNext = iconBtn('Next match', '<path d="M6 10l6 6 6-6"/>');
    searchNav.append(searchPrev, searchCount, searchNext);
    const searchOpenBtn = iconBtn(
      'Search',
      '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    );
    const close = iconBtn('Close', '<path d="M6 6l12 12M18 6L6 18"/>');
    const backBtn = iconBtn('Back', '<path d="M15 18l-6-6 6-6"/>');
    backBtn.classList.add('route-back');
    backBtn.hidden = true;
    const barTitle = bar.querySelector('strong');
    bar.append(searchNav, searchOpenBtn, close);
    bar.prepend(backBtn);

    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    const filters = document.createElement('div');
    filters.className = 'filters';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';

    const scrollBottomBtn = document.createElement('button');
    scrollBottomBtn.type = 'button';
    scrollBottomBtn.className = 'floating-scroll-btn';
    scrollBottomBtn.title = 'Scroll to bottom';
    scrollBottomBtn.setAttribute('aria-label', 'Scroll to bottom');
    scrollBottomBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';
    scrollBottomBtn.onclick = () => {
      sheet.scrollTop = sheet.scrollHeight;
    };

    root.append(bar, filters, sheet, tabs, scrollBottomBtn);

    const empty = (label) => {
      const node = document.createElement('div');
      node.className = 'empty';
      node.textContent = label;
      return node;
    };
    const pair = (label, value) => {
      const node = document.createElement('div');
      node.className = 'pair';
      const name = document.createElement('span');
      const body = document.createElement('b');
      name.textContent = label;
      body.textContent = value || 'None';
      node.append(name, body);
      return node;
    };
    const storageGroup = (title, entries) => {
      const wrap = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = title;
      wrap.append(heading);
      if (!entries.length) wrap.append(pair(title, 'None'));
      entries.forEach((item) => wrap.append(pair(item.name, item.value)));
      return wrap;
    };

    const cleanMessage = (item) => {
      if (item.__clean === undefined) {
        Object.defineProperty(item, '__clean', {
          value: stripBoxBorder(stripAnsi(String(item.message ?? ''))),
          enumerable: false,
        });
      }
      return item.__clean;
    };
    const timeLabel = (iso) => formatTehranDateTime(iso);

    // Filter states for view
    const viewConsoleLevels = new Set();
    let viewConsoleKeyword = '';
    const viewDisabledTags = new Set();
    let viewNetworkKind = 'All';

    let activeSection = 'Console';
    let routeFocus = null;
    let routeLogTab = 'console';
    const syncRouteBar = (node) => {
      const open = !!(node && routeFocus);
      backBtn.hidden = !open;
      barTitle.textContent = open
        ? node.name || node.address || 'Route'
        : 'Spy Tobank logs';
    };
    backBtn.onclick = () => {
      routeFocus = null;
      syncRouteBar(null);
      if (activeSection === 'Routes') renderRoutes();
    };
    let searchQuery = '';
    let searchCursor = 0;
    let activeList = null;
    let refreshBadge = null;
    let flushTimer = null;
    let pending = [];

    const buttons = [];
    const updateTabCounts = () => {
      buttons.forEach((btn) => {
        if (btn.dataset.section === 'Console') {
          btn.textContent = `Console ${sectionCounts.console || 0}`;
        }
        if (btn.dataset.section === 'Network') {
          btn.textContent = `Network ${sectionCounts.network || 0}`;
        }
      });
    };

    // Appends rows in batches of VIEWER_PAGE (newest last); older rows load on demand.
    const createList = (container, items, buildRow, emptyLabel) => {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'btn more';
      const emptyNode = empty(emptyLabel);
      const rows = document.createElement('div');
      let start = Math.max(
        0,
        items.length - (searchQuery ? VIEWER_MAX_DOM : VIEWER_PAGE),
      );
      const build = (from, to) => {
        const fragment = document.createDocumentFragment();
        for (let index = from; index < to; index += 1) {
          fragment.append(buildRow(items[index]));
        }
        return fragment;
      };
      const sync = () => {
        more.hidden = start <= 0;
        more.textContent = `Load older (${start})`;
        emptyNode.hidden = items.length > 0;
      };
      rows.append(build(start, items.length));
      more.onclick = () => {
        const before = sheet.scrollHeight;
        const from = Math.max(0, start - VIEWER_PAGE);
        rows.prepend(build(from, start));
        start = from;
        sheet.scrollTop += sheet.scrollHeight - before;
        sync();
      };
      container.append(more, emptyNode, rows);
      sync();
      sheet.scrollTop = sheet.scrollHeight;
      return {
        append(item) {
          items.push(item);
          const stick =
            sheet.scrollHeight - sheet.scrollTop - sheet.clientHeight < 80;
          rows.append(buildRow(item));
          while (rows.childElementCount > VIEWER_MAX_DOM) {
            rows.firstElementChild.remove();
            start += 1;
          }
          if (stick) sheet.scrollTop = sheet.scrollHeight;
          sync();
        },
      };
    };

    const toggleDetail = (toggle, body, fill) => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.onclick = () => {
        if (!body.firstChild) fill(body);
        body.hidden = !body.hidden;
        toggle.setAttribute('aria-expanded', String(!body.hidden));
      };
    };

    const consoleMatches = (item) => {
      if (isBoxSeparator(String(item.message || ''))) return false;
      if (viewConsoleLevels.size > 0 && !viewConsoleLevels.has(item.level)) {
        return false;
      }
      const msg = cleanMessage(item);
      if (
        viewConsoleKeyword &&
        !msg.toLowerCase().includes(viewConsoleKeyword)
      ) {
        return false;
      }
      const matches = msg.match(/\[([A-Z0-9_]+)\]/g);
      if (matches && matches.length > 0) {
        const names = matches.map((tag) => tag.slice(1, -1));
        const anyActive = names.some((tag) => !viewDisabledTags.has(tag));
        if (!anyActive) return false;
      }
      return true;
    };

    const buildConsoleRow = (item) => {
      const block = document.createElement('div');
      block.className = 'card';
      const levelName = LEVEL_GLYPH[item.level] ? item.level : 'log';
      block.dataset.level = levelName;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'log';

      const line = document.createElement('div');
      line.className = 'line';

      const level = document.createElement('b');
      level.className = 'lvl';
      level.textContent = LEVEL_GLYPH[levelName] + ' ' + levelName;

      const when = document.createElement('span');
      when.className = 'when';
      when.textContent = timeLabel(item.time);

      const preview = document.createElement('span');
      preview.className = 'preview';
      preview.textContent = cleanMessage(item);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'copy';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyText(cleanMessage(item), (ok) => {
          copyBtn.textContent = ok ? 'Copied' : 'Failed';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 1200);
        });
      };

      line.append(level, when, preview);
      toggle.append(line);

      const body = document.createElement('div');
      body.className = 'detail';
      body.hidden = true;
      toggleDetail(toggle, body, (target) => {
        const full =
          item.args && item.args.length
            ? item.args.length === 1
              ? item.args[0]
              : item.args
            : item.message;
        target.append(jsonBlock(full));
      });

      const head = document.createElement('div');
      head.className = 'line';
      head.append(toggle, copyBtn);
      block.append(head, body);
      return block;
    };

    let filterMenu = null;
    let filterMenuCloser = null;
    const closeFilterMenu = () => {
      if (filterMenu) {
        filterMenu.remove();
        filterMenu = null;
      }
      if (filterMenuCloser) {
        document.removeEventListener('pointerdown', filterMenuCloser, true);
        filterMenuCloser = null;
      }
    };
    const wireHorizontalScroll = (bar) => {
      bar.addEventListener(
        'wheel',
        (event) => {
          if (bar.scrollWidth <= bar.clientWidth + 1) return;
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
          event.preventDefault();
          bar.scrollLeft += event.deltaY;
        },
        { passive: false },
      );
      // Chips are buttons, so a touch on them does not scroll the row.
      let drag = null;
      bar.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        drag = {
          id: event.pointerId,
          x: event.clientX,
          left: bar.scrollLeft,
          moved: false,
        };
      });
      bar.addEventListener('pointermove', (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) < 6) return;
        drag.moved = true;
        bar.scrollLeft = drag.left - dx;
        if (bar.setPointerCapture) {
          try {
            bar.setPointerCapture(event.pointerId);
          } catch (err) {}
        }
      });
      const endDrag = (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const moved = drag.moved;
        drag = null;
        if (!moved) return;
        const stopClick = (clickEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          bar.removeEventListener('click', stopClick, true);
        };
        bar.addEventListener('click', stopClick, true);
      };
      bar.addEventListener('pointerup', endDrag);
      bar.addEventListener('pointercancel', endDrag);
    };
    const mountFilters = (bar, menuItems) => {
      closeFilterMenu();
      wireHorizontalScroll(bar);
      const row = document.createElement('div');
      row.className = 'filter-row';
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'filter-more';
      more.setAttribute('aria-label', 'Filters');
      more.title = 'Filters';
      more.textContent = '\u22ee';
      more.onclick = (event) => {
        event.stopPropagation();
        if (filterMenu) {
          closeFilterMenu();
          return;
        }
        if (!document.getElementById('spyt-filter-menu')) {
          const menuStyle = document.createElement('style');
          menuStyle.id = 'spyt-filter-menu';
          menuStyle.textContent =
            '.filter-menu{position:fixed;z-index:2147483647;min-width:200px;max-width:min(280px,calc(100vw - 16px));max-height:min(60vh,420px);overflow:auto;padding:4px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:var(--spyt-popover);color:var(--spyt-fg);box-shadow:var(--spyt-shadow)}' +
            '.filter-menu button{display:flex;width:100%;min-height:44px;align-items:center;padding:0 12px;border:0;border-radius:6px;background:transparent;color:var(--spyt-fg);font:14px var(--spyt-font);text-align:left;cursor:pointer}';
          (document.head || document.documentElement).append(menuStyle);
        }
        const menu = document.createElement('div');
        menu.className = 'filter-menu';
        menuItems.forEach((item) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = (item.active ? '\u2713 ' : '') + item.label;
          btn.onclick = (clickEvent) => {
            clickEvent.stopPropagation();
            item.onClick();
          };
          menu.append(btn);
        });
        const rect = more.getBoundingClientRect();
        menu.style.top =
          Math.min(rect.bottom + 4, window.innerHeight - 48) + 'px';
        menu.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
        document.body.append(menu);
        filterMenu = menu;
        filterMenuCloser = (pointerEvent) => {
          const target = pointerEvent.target;
          if (!filterMenu) return;
          if (filterMenu.contains(target) || more.contains(target)) return;
          closeFilterMenu();
        };
        document.addEventListener('pointerdown', filterMenuCloser, true);
      };
      row.append(bar, more);
      filters.append(row);
    };

    const refreshSearch = () => {
      const query = searchQuery.trim().toLowerCase();
      const nodes = [...sheet.querySelectorAll('.card, .pair')];
      const hits = [];
      nodes.forEach((node) => {
        node.removeAttribute('data-hit');
        if (!query) return;
        if ((node.textContent || '').toLowerCase().includes(query))
          hits.push(node);
      });
      searchOpenBtn.hidden = Boolean(query);
      searchNav.hidden = !query;
      if (!query) return;
      if (!hits.length) {
        searchCursor = 0;
        searchCount.textContent = '0/0';
        return;
      }
      if (searchCursor >= hits.length) searchCursor = 0;
      if (searchCursor < 0) searchCursor = hits.length - 1;
      hits.forEach((node, index) => {
        node.dataset.hit = index === searchCursor ? 'current' : 'yes';
      });
      searchCount.textContent = searchCursor + 1 + '/' + hits.length;
      hits[searchCursor].scrollIntoView({ block: 'center', inline: 'nearest' });
    };
    const endSearch = () => {
      searchQuery = '';
      searchCursor = 0;
      show(activeSection);
    };
    const openFindDialog = () => {
      const overlay = document.createElement('div');
      overlay.className = 'spyt-overlay';
      overlay.innerHTML =
        '<style>' +
        DIALOG_CSS +
        '.spyt-input{padding-right:40px}' +
        '</style>' +
        '<form class="spyt-card">' +
        '<div class="spyt-title">Search this section</div>' +
        '<label class="spyt-label">Text' +
        '<span class="spyt-field" style="position:relative;display:block">' +
        '<input class="spyt-input" name="q" dir="auto" maxlength="200" autocomplete="off" placeholder="Find in this section" />' +
        '<button type="button" class="spyt-clear" data-clear aria-label="Clear" style="position:absolute;right:6px;top:8px;width:32px;height:32px;border:0;background:transparent;color:var(--spyt-muted-fg);font-size:18px;cursor:pointer">×</button>' +
        '</span></label>' +
        '<div class="spyt-actions">' +
        '<button type="button" class="spyt-btn" data-cancel>Cancel</button>' +
        '<button type="submit" class="spyt-btn spyt-btn-primary">Search</button>' +
        '</div></form>';
      const input = overlay.querySelector('input');
      input.value = searchQuery;
      const closeDialog = () => {
        try {
          if (typeof overlay.hidePopover === 'function') overlay.hidePopover();
        } catch (e) {}
        overlay.remove();
      };
      overlay.querySelector('[data-clear]').onclick = () => {
        input.value = '';
        input.focus();
      };
      overlay.querySelector('[data-cancel]').onclick = closeDialog;
      overlay.onsubmit = (event) => {
        event.preventDefault();
        searchQuery = input.value.trim();
        searchCursor = 0;
        closeDialog();
        show(activeSection);
      };
      mountOverlay(overlay);
      input.focus();
    };
    searchOpenBtn.onclick = openFindDialog;
    searchPrev.onclick = () => {
      searchCursor -= 1;
      refreshSearch();
    };
    searchNext.onclick = () => {
      searchCursor += 1;
      refreshSearch();
    };

    const renderConsole = () => {
      filters.replaceChildren();
      sheet.replaceChildren();
      activeList = null;
      refreshBadge = null;

      const filterBar = document.createElement('div');
      filterBar.className = 'filter-bar';

      [
        ['log', 'User'],
        ['error', 'Errors'],
        ['warn', 'Warnings'],
        ['info', 'Info'],
        ['debug', 'Verbose'],
      ].forEach(([level, label]) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.dataset.active = String(viewConsoleLevels.has(level));
        chip.textContent = label;
        chip.onclick = () => {
          if (viewConsoleLevels.has(level)) {
            viewConsoleLevels.delete(level);
          } else {
            viewConsoleLevels.add(level);
          }
          renderConsole();
        };
        filterBar.append(chip);
      });

      const listContainer = document.createElement('div');
      const rebuild = () => {
        listContainer.replaceChildren();
        const items = logs.filter(
          (item) => item.section === 'console' && consoleMatches(item),
        );
        activeList = createList(
          listContainer,
          items,
          buildConsoleRow,
          'No matching console logs',
        );
      };

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-btn';
      clearBtn.textContent = 'Clear';
      clearBtn.onclick = () => {
        removeSection('console');
        console.clear();
        renderConsole();
        updateTabCounts();
      };
      filterBar.append(clearBtn);

      // Tag chips stay on the same scrolling row
      const bufferTags = new Set();
      logs.forEach((item) => {
        if (item.section !== 'console') return;
        const matches = String(item.message ?? '').match(/\[([A-Z0-9_]+)\]/g);
        if (matches) matches.forEach((tag) => bufferTags.add(tag.slice(1, -1)));
      });

      const menuItems = [
        {
          label: 'Select all',
          active: false,
          onClick: () => {
            ['log', 'error', 'warn', 'info', 'debug'].forEach((level) =>
              viewConsoleLevels.add(level),
            );
            viewDisabledTags.clear();
            renderConsole();
          },
        },
        {
          label: 'Unselect all',
          active: false,
          onClick: () => {
            viewConsoleLevels.clear();
            bufferTags.forEach((tag) => viewDisabledTags.add(tag));
            renderConsole();
          },
        },
        ...[
          ['log', 'User'],
          ['error', 'Errors'],
          ['warn', 'Warnings'],
          ['info', 'Info'],
          ['debug', 'Verbose'],
        ].map(([level, label]) => ({
          label,
          active: viewConsoleLevels.has(level),
          onClick: () => {
            if (viewConsoleLevels.has(level)) viewConsoleLevels.delete(level);
            else viewConsoleLevels.add(level);
            renderConsole();
          },
        })),
      ];
      bufferTags.forEach((tag) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.dataset.active = String(!viewDisabledTags.has(tag));
        chip.textContent = tag;
        chip.onclick = () => {
          if (viewDisabledTags.has(tag)) {
            viewDisabledTags.delete(tag);
          } else {
            viewDisabledTags.add(tag);
          }
          renderConsole();
        };
        filterBar.append(chip);
        menuItems.push({
          label: tag,
          active: !viewDisabledTags.has(tag),
          onClick: () => {
            if (viewDisabledTags.has(tag)) viewDisabledTags.delete(tag);
            else viewDisabledTags.add(tag);
            renderConsole();
          },
        });
      });
      mountFilters(filterBar, menuItems);

      sheet.append(listContainer);
      rebuild();
      refreshSearch();
    };

    const networkMatches = (item) => {
      if (viewNetworkKind === 'All') return true;
      const k = item.kind || 'Other';
      if (viewNetworkKind === 'Other') {
        return (
          k === 'Other' ||
          !['Fetch/XHR', 'CSS', 'JS', 'Img', 'Socket'].includes(k)
        );
      }
      return k === viewNetworkKind;
    };

    const buildNetworkRow = (item) => {
      const status = String(item.status);
      const ok = item.ok || (Number(status) >= 200 && Number(status) < 400);
      const block = document.createElement('div');
      block.className = 'card';
      const row = document.createElement('div');
      row.className = 'net-row';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'net';

      const url = document.createElement('span');
      url.className = 'url';
      url.textContent = item.url || '';

      const meta = document.createElement('span');
      meta.className = 'net-meta';

      const method = document.createElement('b');
      method.className = 'method';
      method.dataset.method = (item.method || 'GET').toLowerCase();
      method.textContent = item.method || 'GET';

      const code = document.createElement('span');
      code.className = 'status ' + (ok ? 'ok' : 'bad');
      code.textContent = (ok ? '\u2713 ' : '\u2715 ') + status;

      const when = document.createElement('span');
      when.className = 'when';
      when.textContent = timeLabel(item.time);
      if (item.costTime != null && item.costTime !== '') {
        when.textContent =
          (when.textContent ? when.textContent + ' \u00b7 ' : '') +
          item.costTime +
          ' ms';
      }
      meta.append(method, code, when);
      toggle.append(url, meta);

      const body = document.createElement('div');
      body.className = 'detail';
      body.hidden = true;
      toggleDetail(toggle, body, (target) => {
        const requestLabel = document.createElement('h3');
        requestLabel.textContent = 'Request';
        const responseLabel = document.createElement('h3');
        responseLabel.textContent = 'Response';
        target.append(
          requestLabel,
          jsonBlock(item.requestBody),
          responseLabel,
          jsonBlock(item.error || item.responseBody),
        );
      });

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'copy';
      copyButton.textContent = 'Copy';
      copyButton.setAttribute('aria-label', 'Copy request and response');
      copyButton.onclick = (event) => {
        event.stopPropagation();
        copyText(fullNetworkText(item), (copied) => {
          copyButton.textContent = copied ? 'Copied' : 'Failed';
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 1200);
        });
      };

      row.append(toggle, copyButton);
      block.append(row, body);
      return block;
    };

    const renderNetwork = () => {
      filters.replaceChildren();
      sheet.replaceChildren();
      activeList = null;
      refreshBadge = null;

      const filterBar = document.createElement('div');
      filterBar.className = 'filter-bar';

      ['All', 'Fetch/XHR', 'CSS', 'JS', 'Img', 'Socket', 'Other'].forEach(
        (kind) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'chip';
          chip.dataset.active = String(viewNetworkKind === kind);
          chip.textContent = kind;
          chip.onclick = () => {
            viewNetworkKind = kind;
            renderNetwork();
          };
          filterBar.append(chip);
        },
      );

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-btn';
      clearBtn.textContent = 'Clear';
      clearBtn.onclick = () => {
        removeSection('network');
        renderNetwork();
        updateTabCounts();
      };

      const items = logs.filter(
        (item) => item.section === 'network' && networkMatches(item),
      );
      const countBadge = document.createElement('span');
      countBadge.className = 'filter-count';
      let shown = items.length;
      refreshBadge = () => {
        countBadge.textContent = `${shown} / ${sectionCounts.network || 0}`;
      };
      refreshBadge();
      filterBar.append(countBadge, clearBtn);
      mountFilters(
        filterBar,
        ['All', 'Fetch/XHR', 'CSS', 'JS', 'Img', 'Socket', 'Other'].map(
          (kind) => ({
            label: kind,
            active: viewNetworkKind === kind,
            onClick: () => {
              viewNetworkKind = kind;
              renderNetwork();
            },
          }),
        ),
      );

      const listContainer = document.createElement('div');
      sheet.append(listContainer);
      const list = createList(
        listContainer,
        items,
        buildNetworkRow,
        'No matching network logs',
      );
      activeList = {
        append(item) {
          list.append(item);
          shown = items.length;
          refreshSearch();
        },
      };
      refreshSearch();
    };

    const flush = () => {
      flushTimer = null;
      const batch = pending;
      pending = [];
      if (!root.isConnected) return;
      batch.forEach((entry) => {
        if (!activeList) return;
        if (activeSection === 'Console' && entry.section === 'console') {
          if (consoleMatches(entry)) activeList.append(entry);
        } else if (activeSection === 'Network' && entry.section === 'network') {
          if (networkMatches(entry)) activeList.append(entry);
        }
      });
      if (refreshBadge) refreshBadge();
      updateTabCounts();
    };
    const onLog = (entry) => {
      if (!root.isConnected) {
        subscribers.delete(onLog);
        return;
      }
      pending.push(entry);
      if (!flushTimer) flushTimer = setTimeout(flush, 200);
    };
    subscribers.add(onLog);
    root.__dispose = () => {
      subscribers.delete(onLog);
      clearTimeout(flushTimer);
      flushTimer = null;
      pending = [];
    };
    close.onclick = () => {
      if (searchQuery) {
        endSearch();
        return;
      }
      refreshOpenViewer = null;
      closeFilterMenu();
      root.__dispose();
      root.remove();
    };

    const logsOnPage = (nodes, node) => {
      const span = routeWindow(nodes, node.id);
      const found = [];
      logs.forEach((item, index) => {
        if (item.section !== 'console' && item.section !== 'network') return;
        const time = item.time ? new Date(item.time).getTime() : 0;
        const byTime = time >= span.start && time < span.end;
        const byIndex = index >= span.startIndex && index < span.endIndex;
        if (byTime || byIndex) found.push(item);
      });
      return found;
    };

    const pageDump = (node, items) => {
      const consoleLines = items
        .filter((item) => item.section === 'console')
        .map((item) => timeLabel(item.time) + ' ' + cleanMessage(item));
      const networkBlocks = items
        .filter((item) => item.section === 'network')
        .map((item) => fullNetworkText(item));
      return [
        '# Page',
        node.name || node.address || node.kind || 'Route',
        [node.operation, node.address, node.jsonUrl].filter(Boolean).join('\n'),
        '',
        '# Console',
        consoleLines.join('\n') || '(none)',
        '',
        '# Network',
        networkBlocks.join('\n\n') || '(none)',
      ].join('\n');
    };

    const downloadPage = (node, items) => {
      const stamp = formatTehranStamp(new Date());
      const fileName =
        [
          'pagespy',
          'route',
          cleanPart(node.name || node.address || node.kind, 'page'),
          stamp,
        ].join('_') + '.json';
      saveBlob(
        fileName,
        redactSecrets({
          exportedAt: formatTehranDateTime(new Date()),
          page: {
            name: node.name || '',
            operation: node.operation || '',
            kind: node.kind || '',
            address: node.address || '',
            jsonUrl: node.jsonUrl || '',
          },
          console: items.filter((item) => item.section === 'console'),
          network: items
            .filter((item) => item.section === 'network')
            .map((item) => ({ ...item, url: absoluteUrl(item.url) })),
        }),
      );
    };

    const renderRoutes = () => {
      filters.replaceChildren();
      sheet.replaceChildren();
      activeList = null;
      refreshBadge = null;
      const entries = routeEntries();
      const nodes = buildRouteTrace(entries);
      const selected = routeFocus
        ? nodes.find((node) => node.id === routeFocus)
        : null;

      if (!nodes.length) {
        syncRouteBar(null);
        sheet.append(empty('No routes yet. Open a page, dialog, or sheet.'));
        return;
      }

      if (selected) {
        syncRouteBar(selected);
        const span = routeWindow(nodes, selected.id);
        const inPage = (item, index) => {
          const time = item.time ? new Date(item.time).getTime() : 0;
          const byTime = time >= span.start && time < span.end;
          const byIndex = index >= span.startIndex && index < span.endIndex;
          return byTime || byIndex;
        };
        const items = [];
        const counts = { console: 0, network: 0 };
        logs.forEach((item, index) => {
          if (!inPage(item, index)) return;
          if (item.section === 'console' || item.section === 'network') {
            counts[item.section] += 1;
          }
          if (item.section === routeLogTab) items.push(item);
        });
        const row = document.createElement('div');
        row.className = 'filter-row';
        const bar = document.createElement('div');
        bar.className = 'filter-bar';
        ['console', 'network'].forEach((key) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'chip';
          chip.dataset.active = String(routeLogTab === key);
          chip.textContent =
            key[0].toUpperCase() + key.slice(1) + ' ' + counts[key];
          chip.onclick = () => {
            routeLogTab = key;
            renderRoutes();
          };
          bar.append(chip);
        });
        const pageItems = logsOnPage(nodes, selected);
        const copyPage = document.createElement('button');
        copyPage.type = 'button';
        copyPage.className = 'chip';
        copyPage.textContent = 'Copy all';
        copyPage.onclick = () => {
          copyText(pageDump(selected, pageItems), (ok) => {
            copyPage.textContent = ok ? 'Copied' : 'Failed';
            setTimeout(() => {
              copyPage.textContent = 'Copy all';
            }, 1200);
          });
        };
        const downloadPageBtn = document.createElement('button');
        downloadPageBtn.type = 'button';
        downloadPageBtn.className = 'chip';
        downloadPageBtn.textContent = 'Download all';
        downloadPageBtn.onclick = () => downloadPage(selected, pageItems);
        bar.append(copyPage, downloadPageBtn);
        row.append(bar);
        filters.append(row);

        const listContainer = document.createElement('div');
        activeList = createList(
          listContainer,
          items,
          routeLogTab === 'console' ? buildConsoleRow : buildNetworkRow,
          'No logs on this page',
        );
        sheet.append(listContainer);
        return;
      }

      syncRouteBar(null);
      const map = document.createElement('div');
      map.className = 'route-map';
      nodes.forEach((node, index) => {
        const row = document.createElement('div');
        row.className = 'route-node';
        if (node.kind !== 'page') row.style.paddingLeft = '22px';
        const rail = document.createElement('div');
        rail.className = 'route-rail';
        const dot = document.createElement('span');
        dot.className = 'route-dot';
        dot.dataset.kind = node.kind;
        rail.append(dot);
        if (index < nodes.length - 1) {
          const line = document.createElement('span');
          line.className = 'route-line';
          rail.append(line);
        }
        const body = document.createElement('div');
        body.className = 'route-body';
        const copyNode = document.createElement('div');
        copyNode.className = 'route-copy';
        const heading = document.createElement('strong');
        heading.textContent = node.name || node.address || node.kind;
        const meta = document.createElement('div');
        meta.className = 'route-meta';
        meta.textContent = [node.operation, node.address, node.jsonUrl]
          .filter(Boolean)
          .join(' · ');
        copyNode.append(heading, meta);
        body.append(copyNode);
        if (node.operation !== 'close' && node.operation !== 'pop') {
          const actions = document.createElement('div');
          actions.className = 'route-actions';
          const logsBtn = document.createElement('button');
          logsBtn.type = 'button';
          logsBtn.className = 'btn';
          logsBtn.textContent = 'Logs';
          logsBtn.onclick = () => {
            routeFocus = node.id;
            routeLogTab = 'console';
            renderRoutes();
          };
          const copyAll = document.createElement('button');
          copyAll.type = 'button';
          copyAll.className = 'btn';
          copyAll.textContent = 'Copy all';
          copyAll.onclick = () => {
            const text = pageDump(node, logsOnPage(nodes, node));
            copyText(text, (ok) => {
              copyAll.textContent = ok ? 'Copied' : 'Failed';
              setTimeout(() => {
                copyAll.textContent = 'Copy all';
              }, 1200);
            });
          };
          const downloadAll = document.createElement('button');
          downloadAll.type = 'button';
          downloadAll.className = 'btn';
          downloadAll.textContent = 'Download all';
          downloadAll.onclick = () =>
            downloadPage(node, logsOnPage(nodes, node));
          actions.append(logsBtn, copyAll, downloadAll);
          body.append(actions);
        }
        row.append(rail, body);
        map.append(row);
      });
      sheet.append(map);
    };

    const show = (name) => {
      activeSection = name;
      if (name !== 'Routes') syncRouteBar(null);
      activeList = null;
      refreshBadge = null;
      buttons.forEach((button) => {
        button.dataset.active = String(button.dataset.section === name);
      });
      if (name === 'Console') {
        renderConsole();
        return;
      }
      if (name === 'Network') {
        renderNetwork();
        return;
      }
      if (name === 'Routes') {
        renderRoutes();
        return;
      }
      filters.replaceChildren();
      sheet.replaceChildren();
      if (name === 'Storage') {
        sheet.append(storageGroup('Local storage', data.storage.localStorage));
        sheet.append(
          storageGroup('Session storage', data.storage.sessionStorage),
        );
        sheet.append(pair('Cookie', data.storage.cookie));
        refreshSearch();
        return;
      }
      Object.entries(data.device).forEach(([key, value]) => {
        sheet.append(pair(key, String(value ?? '')));
      });
      refreshSearch();
    };

    [
      ['Console', sectionCounts.console || 0],
      ['Network', sectionCounts.network || 0],
      ['Routes', null],
      ['Storage', null],
      ['Device', null],
    ].forEach(([name, count]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.section = name;
      button.textContent = count == null ? name : name + ' ' + count;
      button.onclick = () => show(name);
      buttons.push(button);
      tabs.append(button);
    });

    document.body.appendChild(root);
    refreshOpenViewer = () => {
      updateTabCounts();
      show(activeSection);
    };
    show('Console');
  };

  // ---- Recordings: manual "Upload logs" -------------------------------------
  // The patched SDK forwards every "public-data" message here (see
  // scripts/patch-sdk-network.mjs). Items use the same shape the DataHarbor
  // plugin stores, so the panel's /log/upload consumers read them unchanged.
  const HARBOR_MAX_ITEMS = 5000;
  const HARBOR_MAX_CHARS = 40000000;
  const HARBOR_TYPES = ['console', 'network', 'storage', 'system'];
  const harbor = [];
  let harborChars = 0;

  const onPublicData = (msg) => {
    if (!msg || !currentSettings.masterLogs) return;
    const type = msg.type;
    if (!HARBOR_TYPES.includes(type)) return;
    let json;
    try {
      json = JSON.stringify(msg.data);
    } catch (error) {
      return;
    }
    if (typeof json !== 'string') return;
    harbor.push({ type, timestamp: Date.now(), json });
    harborChars += json.length;
    syncUploadButton();
    while (
      harbor.length > HARBOR_MAX_ITEMS ||
      (harborChars > HARBOR_MAX_CHARS && harbor.length > 1)
    ) {
      harborChars -= harbor.shift().json.length;
    }
  };

  const hasUploadableLogs = () => harbor.some((item) => item.type !== 'system');

  // DataHarbor stores `data` as a zlib-compressed latin1 string. Do the same
  // when CompressionStream exists, otherwise ship the plain object (the panel
  // accepts both).
  const packData = async (json) => {
    if (typeof CompressionStream !== 'function') return JSON.parse(json);
    const stream = new Blob([json])
      .stream()
      .pipeThrough(new CompressionStream('deflate'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let out = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return out;
  };

  const spyInstance = () =>
    window.$pageSpy || (window.PageSpy && window.PageSpy.instance) || null;

  const spyConfig = () => {
    try {
      const spy = spyInstance();
      return spy && spy.config && spy.config.get ? spy.config.get() : null;
    } catch (error) {
      return null;
    }
  };

  const spyDeviceId = () => {
    try {
      const room = sessionStorage.getItem('page-spy-room');
      if (room) return JSON.parse(room).address || '--';
    } catch (error) {}
    const spy = spyInstance();
    return (spy && spy.address) || '--';
  };

  const buildUpload = async (logTitle, remark) => {
    const title = String(logTitle || '').trim();
    const note = String(remark || '').trim();
    if (!title) throw new Error('A title is required.');
    if (!note) throw new Error('A description is required.');
    const config = spyConfig();
    if (!config || !config.api)
      throw new Error('PageSpy api is not configured');
    const apiBase =
      (config.enableSSL ? 'https://' : 'http://') +
      String(config.api).replace(/\/+$/, '');
    const items = [];
    for (let i = 0; i < harbor.length; i += 50) {
      const part = await Promise.all(
        harbor.slice(i, i + 50).map(async (item) => ({
          type: item.type,
          timestamp: item.timestamp,
          data: await packData(item.json),
        })),
      );
      items.push(...part);
    }
    const startTime = harbor[0] ? harbor[0].timestamp : Date.now();
    const endTime = harbor.length
      ? harbor[harbor.length - 1].timestamp
      : startTime;
    items.push({
      type: 'meta',
      timestamp: endTime,
      data: await packData(
        JSON.stringify({
          ua: navigator.userAgent,
          title: document.title,
          url: window.location.href,
          startTime,
          endTime,
          logTitle: title,
          remark: note,
        }),
      ),
    });
    const fileName = formatTehranStamp(new Date()) + '.json';
    const file = new File([JSON.stringify(items)], fileName, {
      type: 'application/json',
    });
    const body = new FormData();
    body.append('log', file);
    const query = new URLSearchParams({
      project: config.project || '',
      title: config.title || '',
      deviceId: spyDeviceId(),
      userAgent: navigator.userAgent,
      logTitle: title,
      remark: note,
    }).toString();
    return {
      url: apiBase + '/api/v1/log/upload?' + query,
      body,
      count: harbor.length,
    };
  };

  const uploadLogs = async (logTitle, remark) => {
    const request = await buildUpload(logTitle, remark);
    const response = await fetch(request.url, {
      method: 'POST',
      body: request.body,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Upload failed');
    return { count: request.count };
  };

  const mountOverlay = (overlay) => {
    const host = document.getElementById('__pageSpy');
    if (typeof overlay.showPopover === 'function') {
      overlay.setAttribute('popover', 'manual');
      document.body.appendChild(overlay);
      try {
        overlay.showPopover();
      } catch (e) {}
    } else if (host && host.shadowRoot) {
      overlay.style.zIndex = '20000';
      host.shadowRoot.appendChild(overlay);
    } else {
      document.body.appendChild(overlay);
    }
  };

  const openUploadDialog = () => {
    ensureTokens();
    const overlay = document.createElement('div');
    overlay.className = 'spyt-overlay';
    overlay.innerHTML =
      '<style>' +
      DIALOG_CSS +
      '.spyt-textarea{display:block;width:100%;min-height:168px;margin:8px 0 12px;padding:10px 40px 10px 12px;border:1px solid var(--spyt-input);border-radius:var(--spyt-radius);background:var(--spyt-bg);color:var(--spyt-fg);font:16px/1.45 var(--spyt-font);resize:vertical}' +
      '.spyt-field{position:relative;display:block}' +
      '.spyt-field .spyt-input{padding-right:40px}' +
      '.spyt-clear{position:absolute;top:8px;right:6px;width:32px;height:32px;border:0;border-radius:6px;background:transparent;color:var(--spyt-muted-fg);font-size:18px;line-height:1;cursor:pointer}' +
      '.spyt-textarea:focus{outline:2px solid var(--spyt-ring);outline-offset:1px}' +
      '.spyt-status{min-height:20px;margin:0 0 12px;font-size:13px;color:var(--spyt-muted-fg)}' +
      '.spyt-btn:disabled{opacity:.5;cursor:not-allowed}' +
      '</style>' +
      '<form class="spyt-card">' +
      '<div class="spyt-title">Upload logs</div>' +
      '<label class="spyt-label">Title' +
      '<span class="spyt-field">' +
      '<input class="spyt-input" name="logTitle" dir="auto" maxlength="80" autocomplete="off" placeholder="Short title for this log" />' +
      '<button type="button" class="spyt-clear" data-clear="logTitle" aria-label="Clear title">×</button>' +
      '</span></label>' +
      '<label class="spyt-label">Description' +
      '<span class="spyt-field">' +
      '<textarea class="spyt-textarea" name="remark" dir="auto" rows="6" maxlength="1000" placeholder="What did you do, what went wrong?"></textarea>' +
      '<button type="button" class="spyt-clear" data-clear="remark" aria-label="Clear description">×</button>' +
      '</span></label>' +
      '<div class="spyt-status" role="status" aria-live="polite"></div>' +
      '<div class="spyt-actions">' +
      '<button type="button" class="spyt-btn" data-cancel>Cancel</button>' +
      '<button type="submit" class="spyt-btn spyt-btn-primary" data-upload>Upload</button>' +
      '</div></form>';
    const titleInput = overlay.querySelector('input[name="logTitle"]');
    const textarea = overlay.querySelector('textarea');
    overlay.querySelector('[data-clear="logTitle"]').onclick = () => {
      titleInput.value = '';
      titleInput.focus();
    };
    overlay.querySelector('[data-clear="remark"]').onclick = () => {
      textarea.value = '';
      textarea.focus();
    };
    const status = overlay.querySelector('.spyt-status');
    const cancel = overlay.querySelector('[data-cancel]');
    const submit = overlay.querySelector('[data-upload]');
    const close = () => {
      try {
        if (typeof overlay.hidePopover === 'function') overlay.hidePopover();
      } catch (e) {}
      overlay.remove();
    };
    cancel.onclick = close;
    overlay.onsubmit = async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      const logTitle = titleInput.value.trim();
      const remark = textarea.value.trim();
      if (!logTitle) {
        status.style.color = 'var(--spyt-destructive)';
        status.textContent = 'A title is required.';
        titleInput.focus();
        return;
      }
      if (!remark) {
        status.style.color = 'var(--spyt-destructive)';
        status.textContent = 'A description is required.';
        textarea.focus();
        return;
      }
      submit.disabled = true;
      cancel.disabled = true;
      status.style.color = 'var(--spyt-muted-fg)';
      status.textContent = 'Uploading…';
      try {
        const result = await uploadLogs(logTitle, remark);
        status.style.color = 'var(--spyt-success)';
        status.textContent = 'Uploaded (' + result.count + ' events)';
        cancel.textContent = 'Close';
        titleInput.disabled = true;
        textarea.disabled = true;
      } catch (error) {
        status.style.color = 'var(--spyt-destructive)';
        status.textContent =
          'Upload failed: ' + (error && error.message ? error.message : error);
        submit.disabled = false;
        submit.textContent = 'Retry';
      }
      cancel.disabled = false;
    };
    mountOverlay(overlay);
    titleInput.focus();
  };

  const syncUploadButton = () => {
    const host = document.getElementById('__pageSpy');
    const root = host && host.shadowRoot ? host.shadowRoot : document;
    const button = root.querySelector('#page-spy-upload-logs');
    if (button) refreshUploadButton(button);
  };

  const refreshUploadButton = (button) => {
    // Only touch the DOM when something changed: the dialog is watched by a
    // MutationObserver that calls this again, so an unconditional write loops.
    const ready = hasUploadableLogs();
    if (button.disabled !== !ready) button.disabled = !ready;
    const title = ready ? '' : 'Nothing recorded yet. Reproduce the bug first.';
    if (button.title !== title) button.title = title;
    const span = button.querySelector('span');
    const label = ready ? 'Upload logs' : 'Upload logs (nothing yet)';
    if (span && span.textContent !== label) span.textContent = label;
  };

  const download = async () => {
    const fileName = await askFileName(defaultFileName());
    if (!fileName) return;
    saveBlob(fileName, redactSecrets(snapshot()));
  };

  const clear = () => {
    logs.length = 0;
    harbor.length = 0;
    harborChars = 0;
    Object.keys(sectionCounts).forEach((k) => {
      sectionCounts[k] = 0;
    });
    console.clear();
    syncUploadButton();
    if (refreshOpenViewer) refreshOpenViewer();
  };

  const icon = (paths) =>
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    paths +
    '</svg>';

  const actionIcons = {
    copy: icon(
      '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
    ),
    download: icon(
      '<path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 20h14"/>',
    ),
    view: icon(
      '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    ),
    upload: icon(
      '<path d="M12 16V5"/><path d="M8 9l4-4 4 4"/><path d="M5 20h14"/>',
    ),
    clear: icon(
      '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/>',
    ),
    settings: icon(
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    ),
  };

  const mountDialogActions = () => {
    ensureTokens();
    const host = document.getElementById('__pageSpy');
    const root = host && host.shadowRoot ? host.shadowRoot : document;
    const copyButton = root.querySelector('#page-spy-copy-link');
    const footer = copyButton
      ? copyButton.parentElement
      : root.querySelector('.page-spy-modal-footer') ||
        document.querySelector('.page-spy-modal-footer');
    if (!copyButton || !footer) return;
    const sdkAlreadyBuilt = !!footer.querySelector('#page-spy-download-logs');
    if (
      sdkAlreadyBuilt &&
      footer.querySelector('#page-spy-logs-toggle') &&
      footer.querySelector('#page-spy-upload-logs')
    ) {
      refreshUploadButton(footer.querySelector('#page-spy-upload-logs'));
      return;
    }
    if (!root.querySelector('#pagespy-action-style')) {
      const style = document.createElement('style');
      style.id = 'pagespy-action-style';
      style.textContent = [
        '#page-spy-copy-link,#page-spy-download-logs,#page-spy-see-logs,#page-spy-upload-logs,#page-spy-log-settings,#page-spy-clear-logs{width:100% !important;min-height:40px;margin:0 !important;display:flex !important;align-items:center;justify-content:center;gap:8px;padding:0 12px !important;border:1px solid var(--spyt-border) !important;border-radius:var(--spyt-radius) !important;background:transparent !important;color:var(--spyt-fg) !important;box-shadow:none !important;font:13px/1 var(--spyt-font) !important;cursor:pointer}',
        '#page-spy-logs-toggle{width:100%;min-height:40px;margin:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px;border:1px solid var(--spyt-border);border-radius:var(--spyt-radius);background:transparent;color:var(--spyt-fg);font:13px/1 var(--spyt-font);cursor:pointer}',
        '#page-spy-logs-toggle input{appearance:none;width:40px;height:24px;margin:0;border-radius:999px;background:#3a4150;position:relative;cursor:pointer;flex:none}',
        '#page-spy-logs-toggle input::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff}',
        '#page-spy-logs-toggle input:checked{background:var(--spyt-primary)}',
        '#page-spy-logs-toggle input:checked::after{transform:translateX(16px)}',
        '#page-spy-copy-link{background:var(--spyt-primary) !important;border-color:var(--spyt-primary) !important;color:var(--spyt-primary-fg) !important}',
        '#page-spy-copy-link svg,#page-spy-download-logs svg,#page-spy-see-logs svg,#page-spy-upload-logs svg,#page-spy-log-settings svg,#page-spy-clear-logs svg{flex:none}',
        '#page-spy-clear-logs{color:var(--spyt-destructive) !important}',
      ].join('');
      (host && host.shadowRoot ? host.shadowRoot : document.head).append(style);
      if (
        host &&
        host.shadowRoot &&
        !document.getElementById('pagespy-action-style')
      ) {
        document.head.append(style.cloneNode(true));
      }
    }
    footer.style.display = 'flex';
    footer.style.flexDirection = 'column';
    footer.style.gap = '8px';
    footer.style.width = '100%';
    footer.style.padding = '12px 16px max(16px, env(safe-area-inset-bottom))';
    footer.style.boxSizing = 'border-box';
    const paint = (button, kind, label) => {
      button.innerHTML = actionIcons[kind] + '<span></span>';
      button.querySelector('span').textContent = label;
    };
    const makeLogsSwitch = () => {
      const row = document.createElement('label');
      row.id = 'page-spy-logs-toggle';
      const name = document.createElement('span');
      name.textContent = 'Logs';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('role', 'switch');
      input.setAttribute('aria-label', 'Logs');
      input.checked = !!currentSettings.masterLogs;
      input.addEventListener('change', () => {
        saveSettings({ masterLogs: input.checked });
      });
      row.addEventListener('click', (event) => event.stopPropagation());
      row.append(name, input);
      return row;
    };
    paint(copyButton, 'copy', 'Copy debug link');
    const makeButton = (id, kind, label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = id;
      paint(button, kind, label);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      return button;
    };
    let uploadButton = footer.querySelector('#page-spy-upload-logs');
    if (!uploadButton) {
      uploadButton = makeButton(
        'page-spy-upload-logs',
        'upload',
        'Upload logs',
      );
      uploadButton.addEventListener('click', () => {
        if (uploadButton.disabled) return;
        const sdk = window.$pageSpy;
        if (sdk && sdk.constructor && sdk.constructor.modal) {
          try {
            sdk.constructor.modal.close();
          } catch (e) {}
        }
        openUploadDialog();
      });
      const clearTarget = footer.querySelector('#page-spy-clear-logs');
      if (clearTarget) clearTarget.before(uploadButton);
      else footer.append(uploadButton);
    }
    refreshUploadButton(uploadButton);
    if (sdkAlreadyBuilt) {
      const existingToggle = footer.querySelector('#page-spy-logs-toggle');
      if (!existingToggle || !existingToggle.querySelector('input')) {
        const masterButton = makeLogsSwitch();
        if (existingToggle) existingToggle.replaceWith(masterButton);
        else {
          const see = footer.querySelector('#page-spy-see-logs');
          if (see) see.after(masterButton);
          else footer.append(masterButton);
        }
      }
      let settingsButton = footer.querySelector('#page-spy-log-settings');
      if (!settingsButton) {
        settingsButton = makeButton(
          'page-spy-log-settings',
          'settings',
          'Settings',
        );
        settingsButton.addEventListener('click', () => openSettings());
        const toggle = footer.querySelector('#page-spy-logs-toggle');
        if (toggle) toggle.after(settingsButton);
        else footer.append(settingsButton);
      } else if (!settingsButton.querySelector('svg')) {
        paint(settingsButton, 'settings', 'Settings');
      }
      return;
    }
    const downloadButton = makeButton(
      'page-spy-download-logs',
      'download',
      'Download logs',
    );
    const viewButton = makeButton('page-spy-see-logs', 'view', 'See logs');
    const clearButton = makeButton(
      'page-spy-clear-logs',
      'clear',
      'Clear logs',
    );
    const masterButton = makeLogsSwitch();
    const settingsButton = makeButton(
      'page-spy-log-settings',
      'settings',
      'Settings',
    );
    downloadButton.addEventListener('click', () => download());
    viewButton.addEventListener('click', () => openViewer());
    settingsButton.addEventListener('click', () => openSettings());
    clearButton.addEventListener('click', () => clear());
    if (!sdkAlreadyBuilt) {
      copyButton.after(
        downloadButton,
        viewButton,
        masterButton,
        settingsButton,
        clearButton,
      );
      clearButton.before(uploadButton);
    } else if (!footer.querySelector('#page-spy-logs-toggle')) {
      const see = footer.querySelector('#page-spy-see-logs');
      if (see) see.after(masterButton, settingsButton);
      else footer.append(masterButton, settingsButton);
    }
  };

  window.PageSpyClientLogs = {
    install,
    mountDialogActions,
    clear,
    openViewer,
    download,
    record,
    onPublicData,
    buildUpload,
    uploadLogs,
    openUploadDialog,
    getSettings: () => currentSettings,
    saveSettings,
    toggleMaster,
    openSettings,
  };
})();

if (typeof document !== 'undefined') {
  let mounting = false;
  let hostObserver = null;

  const footerReady = () => {
    const host = document.getElementById('__pageSpy');
    const root = host && host.shadowRoot ? host.shadowRoot : document;
    const footer =
      root.querySelector('.page-spy-modal-footer') ||
      document.querySelector('.page-spy-modal-footer');
    if (!footer) return false;
    return !!(
      footer.querySelector('#page-spy-upload-logs') &&
      footer.querySelector('#page-spy-logs-toggle input') &&
      footer.querySelector('#page-spy-log-settings svg') &&
      footer.querySelector('#page-spy-download-logs') &&
      footer.querySelector('#page-spy-see-logs') &&
      footer.querySelector('#page-spy-clear-logs') &&
      footer.querySelector('#page-spy-log-settings')
    );
  };

  const watchHost = () => {
    const host = document.getElementById('__pageSpy');
    if (!host) return;
    if (!hostObserver) hostObserver = new MutationObserver(() => runMount());
    hostObserver.disconnect();
    hostObserver.observe(host, { childList: true, subtree: true });
  };

  const runMount = () => {
    if (mounting || footerReady()) return;
    mounting = true;
    if (hostObserver) hostObserver.disconnect();
    try {
      if (window.PageSpyClientLogs) {
        window.PageSpyClientLogs.mountDialogActions();
      }
    } catch (e) {}
    mounting = false;
    watchHost();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runMount();
      watchHost();
    });
  } else {
    runMount();
    watchHost();
  }
  if (!document.getElementById('__pageSpy')) {
    const waitForHost = new MutationObserver(() => {
      if (!document.getElementById('__pageSpy')) return;
      waitForHost.disconnect();
      watchHost();
      runMount();
    });
    // The SDK mounts #__pageSpy on <html>, not <body>. childList only, no subtree.
    waitForHost.observe(document.documentElement, { childList: true });
  }
  window.addEventListener('modal:show', runMount);
  document.addEventListener(
    'click',
    (e) => {
      if (
        e.target &&
        (e.target.closest('.page-spy-logo') || e.target.closest('#__pageSpy'))
      ) {
        setTimeout(runMount, 0);
      }
    },
    true,
  );
}
