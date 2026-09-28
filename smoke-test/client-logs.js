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

  const record = (entry) => {
    logs.push({ time: new Date().toISOString(), ...entry });
  };

  const install = () => {
    ['debug', 'info', 'log', 'warn', 'error'].forEach((level) => {
      const original = console[level].bind(console);
      console[level] = (...args) => {
        record({
          section: 'console',
          level,
          args: args.map((item) => {
            if (item == null || typeof item !== 'object') return item;
            try {
              return JSON.parse(JSON.stringify(item));
            } catch (error) {
              return String(item);
            }
          }),
          message: args.map(asText).join(' '),
        });
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
        requestBody = '[request body]';
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
        'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center;padding:16px;';
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
        overlay.remove();
        resolve(value);
      };
      overlay.querySelector('[data-cancel]').onclick = () => close(null);
      overlay.onsubmit = (event) => {
        event.preventDefault();
        close(input.value.trim() || initialName);
      };
      document.body.appendChild(overlay);
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

  const writeJson = (parent, value, indent) => {
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
        writeJson(parent, item, indent + 1);
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
      writeJson(parent, item, indent + 1);
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

  const curlText = (item) => {
    const method = String(item.method || 'GET').toUpperCase();
    const quote = (value) =>
      "'" + String(value ?? '').replace(/'/g, "'\\''") + "'";
    const lines = ['curl -X ' + method + ' ' + quote(item.url || '')];
    const headers = Array.isArray(item.requestHeaders)
      ? item.requestHeaders.slice()
      : [];
    const hasType = headers.some(
      (pair) => String(pair[0]).toLowerCase() === 'content-type',
    );
    if (item.requestBody && !hasType)
      headers.push(['content-type', 'application/json']);
    headers.forEach((pair) => {
      lines.push('  -H ' + quote(pair[0] + ': ' + pair[1]));
    });
    if (item.requestBody) {
      const raw =
        typeof item.requestBody === 'string'
          ? item.requestBody
          : JSON.stringify(item.requestBody);
      lines.push('  --data-raw ' + quote(raw));
    }
    const response = deepen(item.responseBody);
    const responseText =
      response == null || response === ''
        ? item.error || ''
        : typeof response === 'string'
        ? response
        : JSON.stringify(response, null, 2);
    return (
      lines.join(' \\\n') + '\n\nResponse ' + item.status + '\n' + responseText
    );
  };

  const openViewer = () => {
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
      '#pagespy-log-viewer .tabs{display:flex;width:100%;gap:6px;padding:8px;background:#fff;border-bottom:1px solid #e4e8f2}',
      '#pagespy-log-viewer .tabs button{flex:1 1 0;min-width:0;border-radius:999px;padding:8px 4px;background:#eef1f7;color:#172033;font-size:13px}',
      '#pagespy-log-viewer .tabs button[data-active="true"]{background:#6d28d9;color:#fff}',
      '#pagespy-log-viewer .sheet{flex:1;min-height:0;width:100%;max-width:none;margin:0;overflow:auto;background:transparent;border-radius:0;box-shadow:none;padding:0 0 max(16px,env(safe-area-inset-bottom))}',
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
      '#pagespy-log-viewer .copy{flex:none;border:1px solid #d7dce8;border-radius:999px;background:#fff;color:#172033;padding:4px 8px;font-size:12px}',
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
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    root.append(bar, tabs, sheet);

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

    const buttons = [];
    const show = (name) => {
      buttons.forEach((button) => {
        button.dataset.active = String(button.dataset.section === name);
      });
      sheet.replaceChildren();
      if (name === 'Console') {
        if (!data.console.length) sheet.append(empty('No console logs'));
        data.console.forEach((item) => {
          const block = document.createElement('div');
          block.className = 'card';
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'log';
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
          preview.textContent = String(item.message || '').replace(/\s+/g, ' ');
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
          const head = document.createElement('div');
          head.className = 'line';
          head.append(level, preview);
          toggle.append(head, when);
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
          sheet.append(block);
        });
        return;
      }
      if (name === 'Network') {
        if (!data.network.length) sheet.append(empty('No network logs'));
        data.network.forEach((item) => {
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
          copyButton.textContent = 'Copy';
          copyButton.onclick = (event) => {
            event.stopPropagation();
            const text = curlText(item);
            const done = (ok) => {
              copyButton.textContent = ok ? 'Copied' : 'Failed';
              setTimeout(() => {
                copyButton.textContent = 'Copy';
              }, 1200);
            };
            const fallback = () => {
              const area = document.createElement('textarea');
              area.value = text;
              area.style.position = 'fixed';
              area.style.left = '-9999px';
              document.body.append(area);
              area.select();
              const ok = document.execCommand('copy');
              area.remove();
              done(ok);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard
                .writeText(text)
                .then(() => done(true))
                .catch(fallback);
            } else {
              fallback();
            }
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
          sheet.append(block);
        });
        return;
      }
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
      ['Console', data.console.length],
      ['Network', data.network.length],
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
    saveBlob(fileName, snapshot());
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
    if (
      !copyButton ||
      !footer ||
      footer.querySelector('#page-spy-download-logs')
    )
      return;
    if (!root.querySelector('#pagespy-action-style')) {
      const style = document.createElement('style');
      style.id = 'pagespy-action-style';
      style.textContent = [
        '#page-spy-copy-link,#page-spy-download-logs,#page-spy-see-logs,#page-spy-clear-logs{width:100% !important;min-height:42px;margin:0 !important;display:flex !important;align-items:center;justify-content:center;gap:8px;padding:0 12px !important;border:1px solid #e6e8f0 !important;border-radius:10px !important;background:#fff !important;color:#1f2430 !important;box-shadow:none !important;font:14px/1 system-ui,sans-serif !important}',
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
    if (root.querySelector('#page-spy-download-logs')) return;
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
    downloadButton.addEventListener('click', () => download());
    viewButton.addEventListener('click', () => openViewer());
    clearButton.addEventListener('click', () => clear());
    copyButton.after(downloadButton, viewButton, clearButton);
  };

  window.PageSpyClientLogs = { install, mountDialogActions, clear };
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
