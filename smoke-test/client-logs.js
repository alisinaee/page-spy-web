import {
  buildCurlCommand,
  redactSecrets,
  createBoxLineGrouper,
  stripAnsi,
  stripBoxBorder,
} from './log-format.js';

(() => {
  const logs = [];
  const textLimit = 12000;

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
    logs.push({ time: new Date().toISOString(), ...entry });
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

  const describeXhrResponse = async (xhr) => {
    let type = '';
    try {
      type = xhr.getResponseHeader('content-type') || '';
    } catch (error) {
      type = '';
    }
    if (/^(image|video|audio)\//.test(type)) return `[${type}]`;
    if (xhr.responseType === 'arraybuffer' || xhr.responseType === 'blob') {
      return describeRequestBody(xhr.response);
    }
    if (xhr.responseType === 'json') return xhr.response;
    try {
      if (typeof xhr.responseText === 'string' && xhr.responseText)
        return xhr.responseText;
    } catch (error) {
      return '';
    }
    return '';
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
  const install = () => {
    if (installed) return;
    installed = true;

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
      const original = console[level].bind(console);
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
      const url = typeof input === 'string' ? input : input && input.url;
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
          url: meta.url,
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
      exportedAt: new Date().toISOString(),
      deviceId: device.id,
      device,
      console: logs.filter((item) => item.section === 'console'),
      network: logs.filter((item) => item.section === 'network'),
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
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
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
      const overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center;padding:16px;border:none;margin:0;width:100vw;height:100dvh;box-sizing:border-box;';
      overlay.innerHTML =
        '<form style="width:min(420px,100%);background:#fff;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.2);font:16px/1.4 system-ui,sans-serif;color:#172033">' +
        '<div style="font-weight:700;margin-bottom:8px">Save logs</div>' +
        '<label style="display:block;font-size:13px;color:#667">File name</label>' +
        '<input name="fileName" style="width:100%;box-sizing:border-box;margin:8px 0 14px;padding:12px;border:1px solid #d7dce8;border-radius:10px;font:inherit" />' +
        '<div style="display:flex;gap:8px">' +
        '<button type="button" data-cancel style="flex:1;padding:12px;border-radius:10px;border:1px solid #d7dce8;background:#fff;color:#172033">Cancel</button>' +
        '<button type="submit" style="flex:1;padding:12px;border:0;border-radius:10px;background:#6d28d9;color:#fff">Save</button>' +
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
      url: item.url,
      method: item.method,
      requestHeader: item.requestHeaders,
      requestPayload: item.requestBody,
    });

  const syncMasterButtons = () => {
    const label = currentSettings.masterLogs ? 'Logs ON' : 'Logs OFF';
    const modal =
      window.$pageSpy &&
      window.$pageSpy.constructor &&
      window.$pageSpy.constructor.modal;
    const span =
      modal &&
      modal.root &&
      modal.root.querySelector('#page-spy-logs-toggle span');
    if (span) span.textContent = label;
  };

  const toggleMaster = () => {
    const next = !currentSettings.masterLogs;
    saveSettings({ masterLogs: next });
    syncMasterButtons();
    return next;
  };

  const mountSettingsOverlay = (overlay) => {
    overlay.classList.add('pagespy-settings');
    if (!document.getElementById('pagespy-settings-style')) {
      const style = document.createElement('style');
      style.id = 'pagespy-settings-style';
      style.textContent = [
        '.pagespy-settings{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;padding:16px;border:none;margin:0;width:100vw;height:100dvh}',
        '.pagespy-settings .settings-card{width:min(440px,100%);max-height:85vh;overflow:auto;background:#fff;border-radius:16px;padding:16px;color:#172033;font:14px/1.45 system-ui,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.2)}',
        '.pagespy-settings h2{margin:0;font-size:16px;font-weight:700}',
        '.pagespy-settings h4{margin:12px 0 6px;font-size:13px;color:#667}',
        '.pagespy-settings .settings-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f2f6}',
        '.pagespy-settings .settings-switch{cursor:pointer;border-radius:999px;padding:3px 10px;font-size:12px;border:1px solid #d7dce8;background:#eef1f7;color:#172033}',
        '.pagespy-settings .settings-switch[data-on="true"]{background:#067647;color:#fff;border-color:#067647}',
        '.pagespy-settings .settings-chips{display:flex;flex-wrap:wrap;gap:6px}',
        '.pagespy-settings .chip{border:1px solid #d7dce8;border-radius:999px;background:#eef1f7;color:#172033;padding:4px 10px;font-size:12px;cursor:pointer}',
        '.pagespy-settings .chip[data-active="true"]{background:#6d28d9;color:#fff;border-color:#6d28d9}',
      ].join('');
      document.head.append(style);
    }
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
    overlay.className = 'settings-overlay';
    const card = document.createElement('div');
    card.className = 'settings-card';
    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    const title = document.createElement('h2');
    title.textContent = 'Capture Settings';
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'chip';
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
      noTags.style.cssText = 'font-size:12px;color:#98a2b3;';
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

    const data = snapshot();
    const existing = document.getElementById('pagespy-log-viewer');
    if (existing) existing.remove();
    const root = document.createElement('div');
    root.id = 'pagespy-log-viewer';
    const style = document.createElement('style');
    style.textContent = [
      '#pagespy-log-viewer{position:fixed;inset:0;z-index:2147483646;width:100vw;height:100dvh;max-width:none;margin:0;display:flex;flex-direction:column;background:#f3f5fa;color:#172033;font:15px/1.45 system-ui,sans-serif}',
      '#pagespy-log-viewer *{box-sizing:border-box}',
      '#pagespy-log-viewer .bar{display:flex;align-items:center;gap:8px;min-height:52px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:#6d28d9;color:#fff}',
      '#pagespy-log-viewer .bar strong{flex:1;font-size:17px}',
      '#pagespy-log-viewer .bar button,#pagespy-log-viewer .tabs button,#pagespy-log-viewer .net{margin:0;border:0;font:inherit;cursor:pointer}',
      '#pagespy-log-viewer .bar button{background:transparent;color:#fff;padding:8px}',
      '#pagespy-log-viewer .bar-btn{border:1px solid rgba(255,255,255,.3)!important;border-radius:8px!important;background:rgba(255,255,255,.15)!important;color:#fff!important;padding:4px 10px!important;font-size:12px!important}',
      '#pagespy-log-viewer .tabs{display:flex;width:100%;gap:6px;padding:8px;background:#fff;border-bottom:1px solid #e4e8f2}',
      '#pagespy-log-viewer .tabs button{flex:1 1 0;min-width:0;border-radius:999px;padding:8px 4px;background:#eef1f7;color:#172033;font-size:13px}',
      '#pagespy-log-viewer .tabs button[data-active="true"]{background:#6d28d9;color:#fff}',
      '#pagespy-log-viewer .sheet{flex:1;min-height:0;width:100%;max-width:none;margin:0;overflow:auto;background:transparent;border-radius:0;box-shadow:none;padding:0 0 max(64px,calc(env(safe-area-inset-bottom) + 64px))}',
      '#pagespy-log-viewer .empty{min-height:100%;display:flex;align-items:center;justify-content:center;color:#667;padding:24px}',
      '#pagespy-log-viewer .row{width:100%;padding:10px 12px;border-bottom:1px solid #e6e9f2;background:#fff}',
      '#pagespy-log-viewer .row b{display:inline-block;min-width:52px;margin-right:8px;font-size:12px;text-transform:uppercase}',
      '#pagespy-log-viewer .msg{white-space:pre-wrap;word-break:break-word}',
      '#pagespy-log-viewer .log{display:block;width:100%;background:#fff;text-align:left;padding:10px 12px;color:#172033;border:0}',
      '#pagespy-log-viewer .preview{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#pagespy-log-viewer .net{display:block;width:100%;background:#fff;text-align:left;padding:10px 12px;color:#172033;border-bottom:1px solid #e6e9f2}',
      '#pagespy-log-viewer .line{display:flex;gap:8px;align-items:baseline;width:100%}',
      '#pagespy-log-viewer .url{flex:1;min-width:0;word-break:break-all}',
      '#pagespy-log-viewer .status{font-weight:700}',
      '#pagespy-log-viewer .status.ok{color:#067647}',
      '#pagespy-log-viewer .status.bad{color:#b42318}',
      '#pagespy-log-viewer pre{width:100%;max-width:none;margin:0;padding:10px 12px 14px;white-space:pre-wrap;word-break:break-word;background:#f8f9fd;font:12px/1.45 ui-monospace,SFMono-Regular,monospace}',
      '#pagespy-log-viewer .pair{display:grid;grid-template-columns:minmax(96px,34%) minmax(0,1fr);gap:8px;width:100%;padding:10px 12px;border-bottom:1px solid #e6e9f2;background:#fff}',
      '#pagespy-log-viewer .pair span{color:#667;word-break:break-word}',
      '#pagespy-log-viewer .pair b{font-weight:600;word-break:break-word}',
      '#pagespy-log-viewer h3{margin:0;padding:12px 12px 4px;font-size:13px;color:#667;background:#f3f5fa}',
      '#pagespy-log-viewer .card{margin:8px;border:1px solid #e6e9f2;border-radius:12px;overflow:hidden;background:#fff}',
      '#pagespy-log-viewer .method{border-radius:999px;padding:2px 6px;font-size:11px;color:#fff;background:#175cd3}',
      '#pagespy-log-viewer .method[data-method=post]{background:#067647}',
      '#pagespy-log-viewer .method[data-method=put]{background:#b54708}',
      '#pagespy-log-viewer .method[data-method=delete]{background:#b42318}',
      '#pagespy-log-viewer .copy{flex:none;border:1px solid #d7dce8;border-radius:999px;background:#fff;color:#172033;padding:4px 8px;font-size:12px;cursor:pointer}',
      '#pagespy-log-viewer .when{display:block;margin:4px 0 0;font-size:11px;font-weight:400;line-height:1.3;color:#98a2b3;text-align:left}',
      '#pagespy-log-viewer .detail{background:#0f172a;color:#e2e8f0}',
      '#pagespy-log-viewer .detail h3{background:transparent;color:#94a3b8;padding:10px 12px 0}',
      '#pagespy-log-viewer .detail pre{background:transparent;color:#e2e8f0;padding:8px 12px 12px}',
      '#pagespy-log-viewer .j-key{color:#c4b5fd}',
      '#pagespy-log-viewer .j-str{color:#86efac}',
      '#pagespy-log-viewer .j-num{color:#93c5fd}',
      '#pagespy-log-viewer .j-bool{color:#fdba74}',
      '#pagespy-log-viewer .j-nil{color:#94a3b8}',
      '#pagespy-log-viewer .j-punct{color:#cbd5e1}',
      '#pagespy-log-viewer .filters{flex:none;background:#fff;border-bottom:1px solid #e4e8f2}',
      '#pagespy-log-viewer .filter-bar{display:flex;flex-wrap:nowrap;gap:6px;padding:8px 12px;background:#fff;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch}',
      '#pagespy-log-viewer .chip,#pagespy-log-viewer .clear-btn,#pagespy-log-viewer .search-input,#pagespy-log-viewer .filter-count{flex:0 0 auto}',
      '#pagespy-log-viewer .chip{border:1px solid #d7dce8;border-radius:999px;background:#eef1f7;color:#172033;padding:4px 10px;font-size:12px;cursor:pointer;user-select:none;transition:background .15s}',
      '#pagespy-log-viewer .chip[data-active="true"]{background:#6d28d9;color:#fff;border-color:#6d28d9}',
      '#pagespy-log-viewer .search-input{width:148px;border:1px solid #d7dce8;border-radius:999px;padding:4px 10px;font-size:12px;outline:none;background:#f8f9fd}',
      '#pagespy-log-viewer .search-input:focus{border-color:#6d28d9;background:#fff}',
      '#pagespy-log-viewer .clear-btn{border:1px solid #fee4e2;border-radius:999px;background:#fef3f2;color:#b42318;padding:4px 10px;font-size:12px;cursor:pointer}',
      '#pagespy-log-viewer .floating-scroll-btn{position:fixed;right:16px;bottom:max(16px,calc(env(safe-area-inset-bottom) + 16px));width:42px;height:42px;border-radius:50%;background:#6d28d9;color:#fff;border:none;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:100}',
      '#pagespy-log-viewer .floating-scroll-btn svg{width:20px;height:20px}',
      '#pagespy-log-viewer .settings-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}',
      '#pagespy-log-viewer .settings-card{width:min(440px,100%);max-height:85vh;overflow-y:auto;background:#fff;border-radius:16px;padding:16px;color:#172033;font-size:14px;box-shadow:0 16px 48px rgba(0,0,0,.2)}',
      '#pagespy-log-viewer .settings-card h2{margin:0 0 12px;font-size:16px;font-weight:700}',
      '#pagespy-log-viewer .settings-card h4{margin:12px 0 6px;font-size:13px;color:#667}',
      '#pagespy-log-viewer .settings-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f2f6}',
      '#pagespy-log-viewer .settings-switch{cursor:pointer;border-radius:999px;padding:3px 10px;font-size:12px;border:1px solid #d7dce8;background:#eef1f7;color:#172033}',
      '#pagespy-log-viewer .settings-switch[data-on="true"]{background:#067647;color:#fff;border-color:#067647}',
      '#pagespy-log-viewer .settings-chips{display:flex;flex-wrap:wrap;gap:6px}',
    ].join('');
    root.append(style);

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = '<strong>Logs</strong>';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.onclick = () => root.remove();

    bar.append(close);

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
    scrollBottomBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';
    scrollBottomBtn.onclick = () => {
      sheet.scrollTop = sheet.scrollHeight;
    };

    root.append(bar, tabs, filters, sheet, scrollBottomBtn);

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

    // Filter states for view
    const viewConsoleLevels = new Set();
    let viewConsoleKeyword = '';
    const viewDisabledTags = new Set();
    let viewNetworkKind = 'All';

    const buttons = [];
    const updateTabCounts = () => {
      const consoleCount = logs.filter((it) => it.section === 'console').length;
      const networkCount = logs.filter((it) => it.section === 'network').length;
      buttons.forEach((btn) => {
        if (btn.dataset.section === 'Console') {
          btn.textContent = `Console ${consoleCount}`;
        }
        if (btn.dataset.section === 'Network') {
          btn.textContent = `Network ${networkCount}`;
        }
      });
    };

    const renderConsole = () => {
      filters.replaceChildren();
      sheet.replaceChildren();

      const filterBar = document.createElement('div');
      filterBar.className = 'filter-bar';

      ALL_CONSOLE_LEVELS.forEach((level) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.dataset.active = String(viewConsoleLevels.has(level));
        chip.textContent = level;
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

      const searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.className = 'search-input';
      searchInput.placeholder = 'Search console...';
      searchInput.value = viewConsoleKeyword;
      searchInput.oninput = (e) => {
        viewConsoleKeyword = e.target.value.trim().toLowerCase();
        renderConsoleList();
      };
      filterBar.append(searchInput);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-btn';
      clearBtn.textContent = 'Clear';
      clearBtn.onclick = () => {
        for (let i = logs.length - 1; i >= 0; i--) {
          if (logs[i].section === 'console') {
            logs.splice(i, 1);
          }
        }
        console.clear();
        renderConsole();
        updateTabCounts();
      };
      filterBar.append(clearBtn);

      // Tag chips stay on the same scrolling row
      const currentConsoleLogs = logs.filter(
        (item) => item.section === 'console',
      );
      const bufferTags = new Set();
      currentConsoleLogs.forEach((item) => {
        const msg = String(item.message ?? '');
        const matches = msg.match(/\[([A-Z0-9_]+)\]/g);
        if (matches) {
          matches.forEach((t) => bufferTags.add(t));
        }
      });

      bufferTags.forEach((tag) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        const isEnabled = !viewDisabledTags.has(tag);
        chip.dataset.active = String(isEnabled);
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
      });
      filters.append(filterBar);

      const listContainer = document.createElement('div');
      sheet.append(listContainer);

      const renderConsoleList = () => {
        listContainer.replaceChildren();
        const activeLogs = logs.filter((item) => item.section === 'console');
        const filtered = activeLogs.filter((item) => {
          if (
            viewConsoleLevels.size > 0 &&
            !viewConsoleLevels.has(item.level)
          ) {
            return false;
          }
          const msg = stripBoxBorder(stripAnsi(String(item.message ?? '')));
          if (
            viewConsoleKeyword &&
            !msg.toLowerCase().includes(viewConsoleKeyword)
          ) {
            return false;
          }
          const matches = msg.match(/\[([A-Z0-9_]+)\]/g);
          if (matches && matches.length > 0) {
            const anyActive = matches.some((t) => !viewDisabledTags.has(t));
            if (!anyActive) return false;
          }
          return true;
        });

        if (!filtered.length) {
          listContainer.append(empty('No matching console logs'));
          return;
        }

        filtered.forEach((item) => {
          const block = document.createElement('div');
          block.className = 'card';
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'log';

          const line = document.createElement('div');
          line.className = 'line';

          const level = document.createElement('b');
          level.textContent = item.level;
          level.style.color =
            item.level === 'error'
              ? '#b42318'
              : item.level === 'warn'
              ? '#b54708'
              : '#344054';

          const preview = document.createElement('span');
          preview.className = 'preview';
          preview.textContent = stripBoxBorder(
            stripAnsi(String(item.message ?? '')),
          );

          const copyBtn = document.createElement('button');
          copyBtn.type = 'button';
          copyBtn.className = 'copy';
          copyBtn.textContent = 'Copy';
          copyBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const cleanText = stripBoxBorder(
              stripAnsi(String(item.message ?? '')),
            );
            copyText(cleanText, (ok) => {
              copyBtn.textContent = ok ? 'Copied' : 'Failed';
              setTimeout(() => {
                copyBtn.textContent = 'Copy';
              }, 1200);
            });
          };

          line.append(level, preview, copyBtn);

          const when = document.createElement('div');
          when.className = 'when';
          const date = new Date(item.time);
          when.textContent = Number.isNaN(date.getTime())
            ? ''
            : date.toLocaleString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              });

          toggle.append(line, when);

          const body = document.createElement('div');
          body.className = 'detail';
          body.hidden = true;

          const full =
            item.args && item.args.length
              ? item.args.length === 1
                ? item.args[0]
                : item.args
              : item.message;
          body.append(jsonBlock(full));

          toggle.onclick = () => {
            body.hidden = !body.hidden;
          };

          block.append(toggle, body);
          listContainer.append(block);
        });
      };

      renderConsoleList();
    };

    const renderNetwork = () => {
      filters.replaceChildren();
      sheet.replaceChildren();

      const filterBar = document.createElement('div');
      filterBar.className = 'filter-bar';

      const chips = ['All', 'Fetch/XHR', 'CSS', 'JS', 'Img', 'Socket', 'Other'];
      chips.forEach((kind) => {
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
      });

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-btn';
      clearBtn.textContent = 'Clear';
      clearBtn.onclick = () => {
        for (let i = logs.length - 1; i >= 0; i--) {
          if (logs[i].section === 'network') {
            logs.splice(i, 1);
          }
        }
        renderNetwork();
        updateTabCounts();
      };

      const networkLogs = logs.filter((item) => item.section === 'network');
      const filtered = networkLogs.filter((item) => {
        if (viewNetworkKind === 'All') return true;
        const k = item.kind || 'Other';
        if (viewNetworkKind === 'Other') {
          return (
            k === 'Other' ||
            !['Fetch/XHR', 'CSS', 'JS', 'Img', 'Socket'].includes(k)
          );
        }
        return k === viewNetworkKind;
      });

      const countBadge = document.createElement('span');
      countBadge.className = 'filter-count';
      countBadge.style.cssText = 'font-size:12px;color:#667;';
      countBadge.textContent = `${filtered.length} / ${networkLogs.length}`;
      filterBar.append(countBadge, clearBtn);

      filters.append(filterBar);

      const listContainer = document.createElement('div');
      sheet.append(listContainer);

      if (!filtered.length) {
        listContainer.append(empty('No matching network logs'));
        return;
      }

      filtered.forEach((item) => {
        const status = String(item.status);
        const ok = item.ok || (Number(status) >= 200 && Number(status) < 400);
        const block = document.createElement('div');
        block.className = 'card';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'net';

        const line = document.createElement('div');
        line.className = 'line';

        const method = document.createElement('b');
        method.className = 'method';
        method.dataset.method = (item.method || 'GET').toLowerCase();
        method.textContent = item.method || 'GET';

        const code = document.createElement('span');
        code.className = 'status ' + (ok ? 'ok' : 'bad');
        code.textContent = status;

        const url = document.createElement('span');
        url.className = 'url';
        url.textContent = item.url || '';

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'copy';
        copyButton.textContent = 'Copy cURL';
        copyButton.onclick = (event) => {
          event.stopPropagation();
          const text = curlText(item);
          copyText(text, (ok) => {
            copyButton.textContent = ok ? 'Copied' : 'Failed';
            setTimeout(() => {
              copyButton.textContent = 'Copy cURL';
            }, 1200);
          });
        };

        line.append(method, code, url, copyButton);

        const when = document.createElement('div');
        when.className = 'when';
        const date = new Date(item.time);
        when.textContent = Number.isNaN(date.getTime())
          ? ''
          : date.toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
            });
        if (item.costTime != null && item.costTime !== '') {
          when.textContent =
            (when.textContent ? when.textContent + ' · ' : '') +
            item.costTime +
            ' ms';
        }

        const body = document.createElement('div');
        body.className = 'detail';
        body.hidden = true;

        const requestLabel = document.createElement('h3');
        requestLabel.textContent = 'Request';
        const responseLabel = document.createElement('h3');
        responseLabel.textContent = 'Response';
        body.append(
          requestLabel,
          jsonBlock(item.requestBody),
          responseLabel,
          jsonBlock(item.error || item.responseBody),
        );

        toggle.append(line, when);
        toggle.onclick = () => {
          body.hidden = !body.hidden;
        };

        block.append(toggle, body);
        listContainer.append(block);
      });
    };

    const show = (name) => {
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
      filters.replaceChildren();
      sheet.replaceChildren();
      if (name === 'Storage') {
        sheet.append(storageGroup('Local storage', data.storage.localStorage));
        sheet.append(
          storageGroup('Session storage', data.storage.sessionStorage),
        );
        sheet.append(pair('Cookie', data.storage.cookie));
        return;
      }
      Object.entries(data.device).forEach(([key, value]) => {
        sheet.append(pair(key, String(value ?? '')));
      });
    };

    [
      ['Console', logs.filter((it) => it.section === 'console').length],
      ['Network', logs.filter((it) => it.section === 'network').length],
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

    show('Console');
    document.body.appendChild(root);
  };

  const download = async () => {
    const fileName = await askFileName(defaultFileName());
    if (!fileName) return;
    saveBlob(fileName, redactSecrets(snapshot()));
  };

  const clear = () => {
    logs.length = 0;
    console.clear();
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
    clear: icon(
      '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/>',
    ),
  };

  const mountDialogActions = () => {
    const host = document.getElementById('__pageSpy');
    const root = host && host.shadowRoot ? host.shadowRoot : document;
    const copyButton = root.querySelector('#page-spy-copy-link');
    const footer = copyButton
      ? copyButton.parentElement
      : root.querySelector('.page-spy-modal-footer') ||
        document.querySelector('.page-spy-modal-footer');
    if (!copyButton || !footer) return;
    const sdkAlreadyBuilt = !!footer.querySelector('#page-spy-download-logs');
    if (sdkAlreadyBuilt && footer.querySelector('#page-spy-logs-toggle'))
      return;
    if (!root.querySelector('#pagespy-action-style')) {
      const style = document.createElement('style');
      style.id = 'pagespy-action-style';
      style.textContent = [
        '#page-spy-copy-link,#page-spy-download-logs,#page-spy-see-logs,#page-spy-logs-toggle,#page-spy-log-settings,#page-spy-clear-logs{width:100% !important;min-height:42px;margin:0 !important;display:flex !important;align-items:center;justify-content:center;gap:8px;padding:0 12px !important;border:1px solid #e6e8f0 !important;border-radius:10px !important;background:#fff !important;color:#1f2430 !important;box-shadow:none !important;font:14px/1 system-ui,sans-serif !important}',
        '#page-spy-copy-link svg,#page-spy-download-logs svg,#page-spy-see-logs svg,#page-spy-clear-logs svg{flex:none}',
        '#page-spy-clear-logs{color:#b42318}',
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
    footer.style.padding = '4px 16px 16px';
    footer.style.boxSizing = 'border-box';
    const paint = (button, kind, label) => {
      button.innerHTML = actionIcons[kind] + '<span></span>';
      button.querySelector('span').textContent = label;
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
    if (sdkAlreadyBuilt) {
      if (!footer.querySelector('#page-spy-logs-toggle')) {
        const masterButton = makeButton(
          'page-spy-logs-toggle',
          'view',
          currentSettings.masterLogs ? 'Logs ON' : 'Logs OFF',
        );
        const settingsButton = makeButton(
          'page-spy-log-settings',
          'view',
          'Settings',
        );
        masterButton.addEventListener('click', () => {
          const on = toggleMaster();
          const span = masterButton.querySelector('span');
          if (span) span.textContent = on ? 'Logs ON' : 'Logs OFF';
        });
        settingsButton.addEventListener('click', () => openSettings());
        const see = footer.querySelector('#page-spy-see-logs');
        if (see) see.after(masterButton, settingsButton);
        else footer.append(masterButton, settingsButton);
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
    const masterButton = makeButton(
      'page-spy-logs-toggle',
      'view',
      currentSettings.masterLogs ? 'Logs ON' : 'Logs OFF',
    );
    const settingsButton = makeButton(
      'page-spy-log-settings',
      'view',
      'Settings',
    );
    downloadButton.addEventListener('click', () => download());
    viewButton.addEventListener('click', () => openViewer());
    masterButton.addEventListener('click', () => {
      const on = toggleMaster();
      const span = masterButton.querySelector('span');
      if (span) span.textContent = on ? 'Logs ON' : 'Logs OFF';
    });
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
    getSettings: () => currentSettings,
    saveSettings,
    toggleMaster,
    openSettings,
  };
})();

if (typeof document !== 'undefined') {
  const runMount = () => {
    try {
      if (window.PageSpyClientLogs) {
        window.PageSpyClientLogs.mountDialogActions();
      }
    } catch (e) {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runMount);
  } else {
    runMount();
  }
  const observer = new MutationObserver(runMount);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener('modal:show', runMount);
  document.addEventListener(
    'click',
    (e) => {
      if (
        e.target &&
        (e.target.closest('.page-spy-logo') || e.target.closest('#__pageSpy'))
      ) {
        setTimeout(runMount, 0);
        setTimeout(runMount, 50);
        setTimeout(runMount, 200);
      }
    },
    true,
  );
}
