import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEVICE_LOGGER_LOAD = 'if(typeof window.__pageSpyLoadDeviceLogs!=="function"){window.__pageSpyLoadDeviceLogs=function(){if(window.PageSpyClientLogs){try{if(window.PageSpyClientLogs.install)window.PageSpyClientLogs.install()}catch(e){}return Promise.resolve()}if(window.__pageSpyDeviceLoggerPromise)return window.__pageSpyDeviceLoggerPromise;window.__pageSpyDeviceLoggerPromise=new Promise(function(resolve,reject){var src="";var scripts=document.getElementsByTagName("script");for(var i=0;i<scripts.length;i++){var item=scripts[i].src||"";if(item.indexOf("page-spy/index.min.js")!==-1)src=item}var base=src?src.replace(/[^\\/]*$/,""):"";if(!base){reject(new Error("sdk"));return}var el=document.createElement("script");el.type="module";el.src=base+"client-logs.js";el.onload=function(){try{if(window.PageSpyClientLogs&&window.PageSpyClientLogs.install)window.PageSpyClientLogs.install()}catch(e){}resolve()};el.onerror=function(){reject(new Error("device logger"))};(document.head||document.documentElement).appendChild(el)});return window.__pageSpyDeviceLoggerPromise}}';
const DEVICE_LOGGER_OPEN = 'var openDeviceLogs=function(){try{if(window.PageSpyClientLogs&&window.PageSpyClientLogs.install)window.PageSpyClientLogs.install()}catch(err){}if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openViewer){window.PageSpyClientLogs.openViewer();return 1}return 0};if(!openDeviceLogs()){' + DEVICE_LOGGER_LOAD + 'window.__pageSpyLoadDeviceLogs().then(function(){if(!openDeviceLogs())Toast.message("On-device log viewer is not on this page")}).catch(function(){Toast.message("On-device log viewer failed to load")})}';
const DEVICE_LOGGER_OPEN_BROKEN = 'var openDeviceLogs=function(){try{if(window.PageSpyClientLogs&&window.PageSpyClientLogs.install)window.PageSpyClientLogs.install()}catch(err){}if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openViewer){window.PageSpyClientLogs.openViewer();return 1}return 0};if(!openDeviceLogs()){var loadDeviceLogs=window.__pageSpyLoadDeviceLogs;if(typeof loadDeviceLogs==="function"){loadDeviceLogs().then(function(){if(!openDeviceLogs())Toast.message("On-device log viewer is not on this page")}).catch(function(){Toast.message("On-device log viewer failed to load")})}else{Toast.message("On-device log viewer is not on this page")}}';


const DEVICE_DIALOG_EXTRAS = [
  'var _btnMaster=document.createElement("label");',
  '_btnMaster.id="page-spy-logs-toggle";',
  '_btnMaster.className="page-spy-btn";',
  '_btnMaster.innerHTML=\'<span>Logs</span><input type="checkbox" role="switch" aria-label="Logs" checked>\';',
  '_btnMaster.onclick=function(e){e.stopPropagation()};',
  '_btnMaster.querySelector("input").onchange=function(){var input=this;var apply=function(){if(window.PageSpyClientLogs&&window.PageSpyClientLogs.saveSettings)window.PageSpyClientLogs.saveSettings({masterLogs:input.checked})};if(window.PageSpyClientLogs&&window.PageSpyClientLogs.saveSettings){apply()}else if(typeof window.__pageSpyLoadDeviceLogs==="function"){window.__pageSpyLoadDeviceLogs().then(apply)}};',
  'var _btnSettings=document.createElement("button");',
  '_btnSettings.type="button";',
  '_btnSettings.id="page-spy-log-settings";',
  '_btnSettings.className="page-spy-btn";',
  '_btnSettings.innerHTML=\'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg><span>Settings</span>\';',
  '_btnSettings.onclick=function(e){e.preventDefault();e.stopPropagation();var apply=function(){if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openSettings)window.PageSpyClientLogs.openSettings()};if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openSettings){apply()}else if(typeof window.__pageSpyLoadDeviceLogs==="function"){window.__pageSpyLoadDeviceLogs().then(apply)}else{Toast.message("On-device log viewer is not on this page")}};',
].join('');
const DEVICE_DIALOG_EXTRAS_OLD = [
  'var _btnMaster=document.createElement("button");',
  '_btnMaster.type="button";',
  '_btnMaster.id="page-spy-logs-toggle";',
  '_btnMaster.className="page-spy-btn";',
  '_btnMaster.innerHTML=\'<span>Logs ON</span>\';',
  '_btnMaster.onclick=function(e){e.preventDefault();e.stopPropagation();var apply=function(){if(!window.PageSpyClientLogs||typeof window.PageSpyClientLogs.toggleMaster!=="function")return;var on=window.PageSpyClientLogs.toggleMaster();var span=_btnMaster.querySelector("span");if(span)span.textContent=on?"Logs ON":"Logs OFF"};if(window.PageSpyClientLogs&&window.PageSpyClientLogs.toggleMaster){apply()}else if(typeof window.__pageSpyLoadDeviceLogs==="function"){window.__pageSpyLoadDeviceLogs().then(apply)}else{Toast.message("On-device log viewer is not on this page")}};',
  'var _btnSettings=document.createElement("button");',
  '_btnSettings.type="button";',
  '_btnSettings.id="page-spy-log-settings";',
  '_btnSettings.className="page-spy-btn";',
  '_btnSettings.innerHTML=\'<span>Settings</span>\';',
  '_btnSettings.onclick=function(e){e.preventDefault();e.stopPropagation();var apply=function(){if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openSettings)window.PageSpyClientLogs.openSettings()};if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openSettings){apply()}else if(typeof window.__pageSpyLoadDeviceLogs==="function"){window.__pageSpyLoadDeviceLogs().then(apply)}else{Toast.message("On-device log viewer is not on this page")}};',
].join('');

const DEVICE_LOGGER_BOOT = ';if(typeof window!=="undefined"&&!window.__pageSpyLoadDeviceLogs){window.__pageSpyLoadDeviceLogs=function(){if(window.PageSpyClientLogs){try{if(window.PageSpyClientLogs.install)window.PageSpyClientLogs.install()}catch(e){}return Promise.resolve()}if(window.__pageSpyDeviceLoggerPromise)return window.__pageSpyDeviceLoggerPromise;window.__pageSpyDeviceLoggerPromise=new Promise(function(resolve,reject){var src="";if(document.currentScript&&document.currentScript.src)src=document.currentScript.src;if(!src){var scripts=document.getElementsByTagName("script");for(var i=0;i<scripts.length;i++){var item=scripts[i].src||"";if(item.indexOf("page-spy/index.min.js")!==-1)src=item}}var base=src?src.replace(/[^/]*$/,""):"";if(!base){reject(new Error("sdk"));return}var el=document.createElement("script");el.type="module";el.src=base+"client-logs.js";el.onload=function(){try{if(window.PageSpyClientLogs&&window.PageSpyClientLogs.install)window.PageSpyClientLogs.install()}catch(e){}resolve()};el.onerror=function(){reject(new Error("device logger"))};(document.head||document.documentElement).appendChild(el)});return window.__pageSpyDeviceLoggerPromise};window.__pageSpyLoadDeviceLogs()}';

function publishDeviceLogger(sdkFilePath) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, '..');
  const destDir = path.dirname(path.resolve(sdkFilePath));
  for (const name of ['client-logs.js', 'log-format.js']) {
    fs.copyFileSync(path.join(root, 'smoke-test', name), path.join(destDir, name));
  }
  console.log(`published device logger to ${destDir}`);
}


// Spy Tobank tokens for the SDK's own UI. client-logs.js defines --spyt-* on
// :root; the hex fallbacks keep the SDK usable before that file has loaded.
const SPYT = {
  bg: '#0b0d12',
  card: '#12151c',
  popover: '#181c25',
  muted: '#1f2430',
  border: '#5c6b86',
  input: '#5c6b86',
  fg: '#e7e9ee',
  'muted-fg': '#9aa3b2',
  primary: '#e10613',
  'primary-fg': '#ffffff',
  'primary-text': '#ff8a8a',
  destructive: '#f87171',
};
const t = (name) => `var(--spyt-${name},${SPYT[name]})`;

function buildSdkCss() {
  return [
    // theme variables the SDK's own stylesheet reads
    `#__pageSpy{--primary-color:${t('primary')}!important;--text-primary:${t('fg')};--text-secondary:${t('muted-fg')};--text-placeholder:${t('muted-fg')};--divider-color:${t('border')};--border-color:${t('border')};--disabled-color:${t('muted')};--font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--dark-shadow:none}`,
    // float button
    `#__pageSpy .page-spy-logo{width:48px;height:48px;border-radius:50%;background-color:${t('primary')};border:1px solid ${t('primary')};box-shadow:none;left:auto;top:auto;right:16px;bottom:calc(16px + env(safe-area-inset-bottom))}`,
    `#__pageSpy .page-spy-logo.inactive{background-color:${t('muted')};border-color:${t('border')};filter:none}`,
    `#__pageSpy .page-spy-logo::after{background-color:${t('primary')}}`,
    `#__pageSpy .page-spy-logo img{width:28px;filter:brightness(0) invert(1)}`,
    `#__pageSpy .page-spy-logo.page-spy-idle{opacity:.5;transform:translate(var(--page-spy-idle-x,0),var(--page-spy-idle-y,0))}`,
    // modal surface
    `#__pageSpy .page-spy-modal{background-color:rgba(0,0,0,.6)!important;animation:none!important;pointer-events:none!important}`,
    `#__pageSpy .page-spy-modal-content{pointer-events:auto;max-height:calc(100dvh - 32px);overflow:auto;background:${t('popover')};color:${t('fg')};border:1px solid ${t('border')};border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4)}`,
    `#__pageSpy .page-spy-modal-header{background:${t('popover')}!important;color:${t('fg')}!important;border-bottom:1px solid ${t('border')}}`,
    `#__pageSpy .page-spy-modal-header svg,#__pageSpy .page-spy-modal-header img{filter:none}`,
    `#__pageSpy .page-spy-modal-main{background:${t('popover')}!important;color:${t('fg')}}`,
    `#__pageSpy .page-spy-modal-main b{color:${t('fg')}}`,
    `#__pageSpy .page-spy-modal-main span{color:${t('muted-fg')}}`,
    // footer + buttons
    `#__pageSpy .page-spy-modal-footer{display:flex!important;flex-direction:column!important;gap:8px!important;width:100%!important;padding:12px 16px max(16px,env(safe-area-inset-bottom))!important;box-sizing:border-box!important;background:${t('popover')}!important;border-top:1px solid ${t('border')}!important}`,
    `#__pageSpy .page-spy-modal-footer button,#__pageSpy .page-spy-modal-footer #page-spy-logs-toggle{width:100%!important;min-height:40px;margin:0!important;display:flex!important;align-items:center;justify-content:center;gap:8px;padding:0 12px!important;border:1px solid ${t('border')}!important;border-radius:8px!important;background:transparent!important;color:${t('fg')}!important;box-shadow:none!important;font:13px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;letter-spacing:0;cursor:pointer}`,
    `#__pageSpy .page-spy-modal-footer #page-spy-logs-toggle{justify-content:space-between!important}`,
    `#__pageSpy .page-spy-modal-footer #page-spy-logs-toggle input{appearance:none;width:40px;height:24px;margin:0;border:0;border-radius:999px;background:#3a4150;position:relative;cursor:pointer;flex:none}`,
    `#__pageSpy .page-spy-modal-footer #page-spy-logs-toggle input::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff}`,
    `#__pageSpy .page-spy-modal-footer #page-spy-logs-toggle input:checked{background:${t('primary')}}`,
    `#__pageSpy .page-spy-modal-footer #page-spy-logs-toggle input:checked::after{transform:translateX(16px)}`,
    `#__pageSpy .page-spy-modal-footer button svg,#__pageSpy .page-spy-modal-footer button img{display:block!important;flex:none;width:16px;height:16px}`,
    `#__pageSpy .page-spy-modal-footer #page-spy-copy-link{background:${t('primary')}!important;color:${t('primary-fg')}!important;border-color:${t('primary')}!important}`,
    `#__pageSpy .page-spy-modal-footer #page-spy-clear-logs{color:${t('destructive')}!important}`,
    `#__pageSpy .page-spy-modal-footer button:disabled{opacity:.5;cursor:not-allowed}`,
    `#__pageSpy .page-spy-modal-footer button:focus-visible{outline:2px solid ${t('primary-text')};outline-offset:2px}`,
    // toast
    `#__pageSpy .page-spy-toast{background:${t('card')}!important;color:${t('fg')}!important;border:1px solid ${t('border')};border-radius:8px;box-shadow:none;min-height:44px;font-size:14px}`,
  ].join('');
}


const TYPED_ARRAY_RETURN = 'if(isTypedArray(e))return"[object TypedArray]";';
const BLOB_RETURN = 'if(isBlob(e))return"[object Blob]";';

function formatBinaryRequestBody(input) {
  function textOf(view) {
    return new TextDecoder('utf-8').decode(view).replace(/^\uFEFF/, '');
  }

  function mostlyText(data) {
    const sample = data.subarray(0, Math.min(data.length, 2048));
    let weird = 0;
    for (let index = 0; index < sample.length; index += 1) {
      const byte = sample[index];
      if (byte === 9 || byte === 10 || byte === 13) continue;
      if (byte < 32) weird += 1;
    }
    return sample.length > 0 && weird / sample.length < 0.05;
  }

  function readMultipartFields(data) {
    const latin1 = new TextDecoder('iso-8859-1').decode(data);
    const eol = latin1.includes('\r\n') ? '\r\n' : '\n';
    const firstEol = latin1.indexOf(eol);
    if (firstEol < 0) return null;
    const marker = latin1.slice(0, firstEol);
    if (!marker.startsWith('--')) return null;
    const fields = [];
    latin1.split(marker).forEach((chunk) => {
      let part = chunk;
      if (part.startsWith(eol)) part = part.slice(eol.length);
      if (!part.trim() || part.trim() === '--') return;
      const separator = eol + eol;
      const splitAt = part.indexOf(separator);
      if (splitAt < 0) return;
      const rawHeaders = part.slice(0, splitAt);
      let body = part.slice(splitAt + separator.length);
      if (body.endsWith(eol)) body = body.slice(0, -eol.length);
      let name = 'part';
      let filename = '';
      let type = '';
      rawHeaders.split(eol).forEach((line) => {
        const lower = line.toLowerCase();
        if (lower.startsWith('content-disposition:')) {
          const foundName = /name="([^"]*)"/.exec(line);
          const foundFile = /filename="([^"]*)"/.exec(line);
          if (foundName) name = foundName[1];
          if (foundFile) filename = foundFile[1];
        } else if (lower.startsWith('content-type:')) {
          type = line.slice(line.indexOf(':') + 1).trim();
        }
      });
      const textual =
        !filename &&
        (!type || /json|text|xml|javascript|form-urlencoded/i.test(type));
      if (textual) {
        const raw = new Uint8Array(body.length);
        for (let index = 0; index < body.length; index += 1) {
          raw[index] = body.charCodeAt(index) & 255;
        }
        fields.push([name, new TextDecoder('utf-8').decode(raw)]);
        return;
      }
      const label = [
        'file',
        filename ? `name=${filename}` : '',
        type ? `type=${type}` : '',
        `size=${body.length}`,
      ]
        .filter(Boolean)
        .join(' ');
      fields.push([name, `(${label})`]);
    });
    return fields.length ? fields : null;
  }

  const bytes =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (!bytes.length) return null;
  const limit = typeof MAX_SIZE === 'number' ? MAX_SIZE : 2097152;
  if (bytes.length > limit) return `[binary ${bytes.length} bytes]`;

  const head = textOf(bytes.subarray(0, Math.min(bytes.length, 1024)));
  const trimmed = head.trim();
  const first = trimmed.charAt(0);
  const looksLikeJson =
    first === '{' ||
    first === '[' ||
    first === '"' ||
    first === 't' ||
    first === 'f' ||
    first === 'n' ||
    (first >= '0' && first <= '9');
  if (looksLikeJson) return textOf(bytes);
  if (trimmed.startsWith('--') || /content-disposition\s*:/i.test(head)) {
    const fields = readMultipartFields(bytes);
    if (fields) return fields;
  }
  if (mostlyText(bytes)) return textOf(bytes);
  return `[binary ${bytes.length} bytes]`;
}

async function formatBlobRequestBody(b) {
  if ((typeof isFile === 'function' && isFile(b)) || (b && typeof b === 'object' && 'name' in b && 'size' in b)) {
    const label = [
      'file',
      b.name ? `name=${b.name}` : '',
      b.type ? `type=${b.type}` : '',
      `size=${b.size}`,
    ]
      .filter(Boolean)
      .join(' ');
    return `(${label})`;
  }
  try {
    const limit = typeof MAX_SIZE === 'number' ? MAX_SIZE : 2097152;
    if (b.size > limit) return `[binary ${b.size} bytes]`;
    const buf = await b.arrayBuffer();
    return formatBinaryRequestBody(buf);
  } catch (err) {
    return '[object Blob]';
  }
}

async function formatResponseBlob(b) {
  const isMedia = Boolean(
    b &&
      b.type &&
      (b.type.startsWith('image/') ||
        b.type.startsWith('video/') ||
        b.type.startsWith('audio/')),
  );
  const cap = isMedia
    ? 102400
    : typeof MAX_SIZE === 'number'
    ? MAX_SIZE
    : 2097152;
  if (b.size <= cap) {
    try {
      const b64 = await blob2base64Async(b);
      return { response: b64, responseReason: null };
    } catch (err) {
      try {
        const txt = await b.text();
        return { response: txt, responseReason: null };
      } catch (e2) {
        return { response: '[object Blob]', responseReason: null };
      }
    }
  }
  if (isMedia) {
    return {
      response: `[${b.type || 'media'} ${b.size} bytes]`,
      responseReason: null,
    };
  }
  const exceedReason =
    typeof Reason !== 'undefined' && Reason.EXCEED_SIZE
      ? Reason.EXCEED_SIZE
      : 'Exceed maximum limit';
  return { response: '[object Blob]', responseReason: exceedReason };
}

function patchSdk(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  let next = source;

  // 1. Inject helpers before getFormattedBody
  const helpers = [
    formatBinaryRequestBody.toString(),
    formatBlobRequestBody.toString(),
    formatResponseBlob.toString(),
  ].join(';\n');

  if (!next.includes('function formatBinaryRequestBody')) {
    const anchor = 'async function getFormattedBody';
    const at = next.indexOf(anchor);
    if (at < 0) throw new Error(`getFormattedBody anchor not found in ${filePath}`);
    next = next.slice(0, at) + helpers + ';\n' + next.slice(at);
  }

  // 2. Patch getFormattedBody: replace isBlob(e) and isTypedArray(e)
  const OLD_BODY_BRANCHES = 'if(isBlob(e))return"[object Blob]";if(isTypedArray(e))return"[object TypedArray]";';
  const NEW_BODY_BRANCHES = 'if(isBlob(e))return await formatBlobRequestBody(e);if(isTypedArray(e)||isArrayBuffer(e))return formatBinaryRequestBody(e);';
  const PREV_TYPED_ARRAY_PATCH = 'if(isBlob(e))return"[object Blob]";if(isTypedArray(e)||isArrayBuffer(e))return formatBinaryRequestBody(e);';

  if (next.includes(OLD_BODY_BRANCHES)) {
    next = next.replace(OLD_BODY_BRANCHES, NEW_BODY_BRANCHES);
  } else if (next.includes(PREV_TYPED_ARRAY_PATCH)) {
    next = next.replace(PREV_TYPED_ARRAY_PATCH, NEW_BODY_BRANCHES);
  } else if (!next.includes(NEW_BODY_BRANCHES)) {
    throw new Error(`getFormattedBody body branch not found in ${filePath}`);
  }

  // 3. Patch XHR formatResponse
  const XHR_OLD = 'if(isBlob(r))if(r.size<=MAX_SIZE)try{t.response=await blob2base64Async(r)}catch(e){t.response=await r.text(),psLog.error(e instanceof Error?e.message:String(e))}else t.response="[object Blob]",t.responseReason=Reason.EXCEED_SIZE';
  const XHR_NEW = 'if(isBlob(r)){const n=await formatResponseBlob(r);t.response=n.response,t.responseReason=n.responseReason}';
  if (next.includes(XHR_OLD)) {
    next = next.replace(XHR_OLD, XHR_NEW);
  } else if (!next.includes(XHR_NEW)) {
    throw new Error(`XHR formatResponse blob branch not found in ${filePath}`);
  }

  // 4. Patch Fetch formatResponse
  const FETCH_OLD = 'case"blob":const t=e;if(t.size<=MAX_SIZE)try{s.response=await blob2base64Async(t)}catch(e){s.response=await t.text(),psLog.error(e instanceof Error?e.message:String(e))}else s.response="[object Blob]",s.responseReason=Reason.EXCEED_SIZE';
  const FETCH_NEW = 'case"blob":const t=e;const n=await formatResponseBlob(t);s.response=n.response,s.responseReason=n.responseReason';
  if (next.includes(FETCH_OLD)) {
    next = next.replace(FETCH_OLD, FETCH_NEW);
  } else if (!next.includes(FETCH_NEW)) {
    throw new Error(`Fetch formatResponse blob branch not found in ${filePath}`);
  }

  // 5. Patch PagePlugin to send snapshot on init/join
  const PAGE_PLUGIN_OLD = 'class PagePlugin{constructor(){_defineProperty(this,"name","PagePlugin"),_defineProperty(this,"$pageSpyConfig",null)}onInit(e){let{config:t}=e;PagePlugin.hasInitd||(PagePlugin.hasInitd=!0,this.$pageSpyConfig=t,socketStore.addListener("refresh",((e,t)=>{let{source:r}=e;const{data:n}=r;if("page"===n){var o,a;const e=PagePlugin.collectHtml();if(!1===(null===(o=this.$pageSpyConfig)||void 0===o||null===(o=o.dataProcessor)||void 0===o||null===(a=o.page)||void 0===a?void 0:a.call(o,e)))return;const r=makeMessage("page",e);socketStore.dispatchEvent("public-data",r),t(r)}})))}onReset(){PagePlugin.hasInitd=!1}static collectHtml(){return{html:document.documentElement.outerHTML,location:window.location}}}';
  const PAGE_PLUGIN_PREV = 'class PagePlugin{constructor(){_defineProperty(this,"name","PagePlugin"),_defineProperty(this,"$pageSpyConfig",null)}onInit(e){let{config:t}=e;if(!PagePlugin.hasInitd){PagePlugin.hasInitd=!0,this.$pageSpyConfig=t;const send=(cb)=>{var o,a;const e=PagePlugin.collectHtml();if(!1===(null===(o=this.$pageSpyConfig)||void 0===o||null===(o=o.dataProcessor)||void 0===o||null===(a=o.page)||void 0===a?void 0:a.call(o,e)))return;const r=makeMessage("page",e);socketStore.dispatchEvent("public-data",r);if(typeof cb==="function"){cb(r)}else{socketStore.broadcastMessage(r)}};socketStore.addListener("refresh",((e,t)=>{let{source:r}=e;const{data:n}=r;if("page"===n){send(t)}}));socketStore.addListener("debugger-online",(()=>{send()}));socketStore.addListener("harbor-clear",(()=>{send()}));}}onReset(){PagePlugin.hasInitd=!1}static collectHtml(){return{html:document.documentElement?document.documentElement.outerHTML:"",location:window.location?{href:window.location.href,origin:window.location.origin,protocol:window.location.protocol,host:window.location.host,hostname:window.location.hostname,port:window.location.port,pathname:window.location.pathname,search:window.location.search,hash:window.location.hash}:null}}}';
  const PAGE_PLUGIN_NEW = 'class PagePlugin{constructor(){_defineProperty(this,"name","PagePlugin"),_defineProperty(this,"$pageSpyConfig",null)}onInit(e){let{config:t}=e;if(!PagePlugin.hasInitd){PagePlugin.hasInitd=!0,this.$pageSpyConfig=t;const send=(cb)=>{try{if(typeof window!=="undefined"&&window.PageSpyClientLogs){var _s=window.PageSpyClientLogs.getSettings?window.PageSpyClientLogs.getSettings():null;if(_s&&_s.pageSnapshots===false)return;}}catch(_e){}var o,a;const e=PagePlugin.collectHtml();if(!1===(null===(o=this.$pageSpyConfig)||void 0===o||null===(o=o.dataProcessor)||void 0===o||null===(a=o.page)||void 0===a?void 0:a.call(o,e)))return;const r=makeMessage("page",e);socketStore.dispatchEvent("public-data",r);if(typeof cb==="function"){cb(r)}else{socketStore.broadcastMessage(r)}};socketStore.addListener("refresh",((e,t)=>{let{source:r}=e;const{data:n}=r;if("page"===n){send(t)}}));socketStore.addListener("debugger-online",(()=>{send()}));socketStore.addListener("harbor-clear",(()=>{send()}));}}onReset(){PagePlugin.hasInitd=!1}static collectHtml(){return{html:document.documentElement?document.documentElement.outerHTML:"",location:window.location?{href:window.location.href,origin:window.location.origin,protocol:window.location.protocol,host:window.location.host,hostname:window.location.hostname,port:window.location.port,pathname:window.location.pathname,search:window.location.search,hash:window.location.hash}:null}}}';

  if (next.includes(PAGE_PLUGIN_OLD)) {
    next = next.replace(PAGE_PLUGIN_OLD, PAGE_PLUGIN_NEW);
  } else if (next.includes(PAGE_PLUGIN_PREV)) {
    next = next.replace(PAGE_PLUGIN_PREV, PAGE_PLUGIN_NEW);
  } else if (!next.includes(PAGE_PLUGIN_NEW)) {
    throw new Error(`PagePlugin definition not found in ${filePath}`);
  }

  // 6. Native dialog action buttons in SDK startRender
  const SDK_TARGET = 'd&&(m.disabled=!0,m.title="In Offline Mode"),modal.build({logo:l.logo||img$2,title:l.title||"PageSpy",content:y,footer:[m],mounted:h})';
  const SDK_REPLACEMENT = [
    'd&&(m.disabled=!0,m.title="In Offline Mode");',
    '(()=>{',
    'var _btnDl=document.createElement("button");',
    '_btnDl.type="button";',
    '_btnDl.id="page-spy-download-logs";',
    '_btnDl.className="page-spy-btn";',
    '_btnDl.innerHTML=\'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 20h14"/></svg><span>Download logs</span>\';',
    '_btnDl.onclick=function(e){e.preventDefault();e.stopPropagation();if(window.PageSpyClientLogs&&window.PageSpyClientLogs.download){window.PageSpyClientLogs.download()}else{Toast.message("On-device log viewer is not on this page")}}.bind(this);',
    'var _btnView=document.createElement("button");',
    '_btnView.type="button";',
    '_btnView.id="page-spy-see-logs";',
    '_btnView.className="page-spy-btn";',
    '_btnView.innerHTML=\'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg><span>See logs</span>\';',
    '_btnView.onclick=function(e){e.preventDefault();e.stopPropagation();if(window.$pageSpy&&window.$pageSpy.constructor&&window.$pageSpy.constructor.modal&&typeof window.$pageSpy.constructor.modal.close==="function"){try{window.$pageSpy.constructor.modal.close()}catch(err){}}' + DEVICE_LOGGER_OPEN + '}.bind(this);',
    'var _btnClear=document.createElement("button");',
    '_btnClear.type="button";',
    '_btnClear.id="page-spy-clear-logs";',
    '_btnClear.className="page-spy-btn";',
    '_btnClear.innerHTML=\'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg><span>Clear logs</span>\';',
    '_btnClear.onclick=function(e){e.preventDefault();e.stopPropagation();if(window.PageSpyClientLogs&&window.PageSpyClientLogs.clear){window.PageSpyClientLogs.clear()}var cleared=false;var plugins=this.plugins||[];for(var pi=0;pi<plugins.length;pi++){var p=plugins[pi];if(p&&p.name==="DataHarborPlugin"&&typeof p.clearAndNotify==="function"){p.clearAndNotify();cleared=true}}if(!cleared&&typeof socketStore!=="undefined"&&socketStore.dispatchEvent){socketStore.dispatchEvent("harbor-clear",null)}console.clear();modal.close();Toast.message("Logs cleared")}.bind(this);',
    'var _st=document.createElement("style");',
    '_st.textContent="";',
    'h.appendChild(_st);',
    'modal.build({logo:l.logo||img$2,title:l.title||"PageSpy",content:y,footer:[m,_btnDl,_btnView,_btnClear],mounted:h});window.PageSpyModal=modal;PageSpy.modal=modal;if(typeof f!=="undefined"&&f)f.onclick=function(){modal.show()};',
    '})()',
  ].join('');

  const SDK_PREV_SEE_LOGS = '_btnView.onclick=function(e){e.preventDefault();e.stopPropagation();if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openViewer){window.PageSpyClientLogs.openViewer()}';
  const SDK_NEW_SEE_LOGS = '_btnView.onclick=function(e){e.preventDefault();e.stopPropagation();if(window.$pageSpy&&window.$pageSpy.constructor&&window.$pageSpy.constructor.modal&&typeof window.$pageSpy.constructor.modal.close==="function"){try{window.$pageSpy.constructor.modal.close()}catch(err){}}if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openViewer){window.PageSpyClientLogs.openViewer()}';

  if (next.includes(SDK_TARGET)) {
    next = next.replace(SDK_TARGET, SDK_REPLACEMENT);
  } else if (next.includes(SDK_PREV_SEE_LOGS)) {
    next = next.replace(SDK_PREV_SEE_LOGS, SDK_NEW_SEE_LOGS);
  } else if (!next.includes('_btnDl')) {
    throw new Error(`SDK startRender anchor not found in ${filePath}`);
  }

  const panelFallback = 'if(window.PageSpyClientLogs&&window.PageSpyClientLogs.openViewer){window.PageSpyClientLogs.openViewer()}else{var ul="".concat(n,"/#/devtools?address=").concat(encodeURIComponent(this.address||""));s&&i&&(ul+="&secret=".concat(i));window.open(ul,"_blank")}';
  if (next.includes(panelFallback)) {
    next = next.replace(panelFallback, DEVICE_LOGGER_OPEN);
  }
  if (next.includes('window.open(ul,"_blank")')) {
    throw new Error('See logs still opens the remote panel');
  }
  if (next.includes(DEVICE_LOGGER_OPEN_BROKEN)) {
    next = next.replace(DEVICE_LOGGER_OPEN_BROKEN, DEVICE_LOGGER_OPEN);
  }
  if (!next.includes('base+"client-logs.js"')) {
    next += DEVICE_LOGGER_BOOT;
  }

  const pageSpyExport = "\n;if(typeof window !== 'undefined'){window.PageSpy=PageSpy;};\n";
  if (!next.includes("window.PageSpy=PageSpy")) {
    next += pageSpyExport;
  }
  if (next.includes(DEVICE_DIALOG_EXTRAS_OLD)) {
    next = next.replace(DEVICE_DIALOG_EXTRAS_OLD, DEVICE_DIALOG_EXTRAS);
  }
  if (!next.includes('page-spy-logs-toggle')) {
    const clearStart = 'var _btnClear=document.createElement("button");';
    if (!next.includes(clearStart)) {
      throw new Error('clear button anchor missing');
    }
    next = next.replace(clearStart, DEVICE_DIALOG_EXTRAS + clearStart);
    next = next.replace(
      'footer:[m,_btnDl,_btnView,_btnClear]',
      'footer:[m,_btnDl,_btnView,_btnMaster,_btnSettings,_btnClear]',
    );
    next = next.replace(
      '#page-spy-see-logs,#page-spy-clear-logs{',
      '#page-spy-see-logs,#page-spy-logs-toggle,#page-spy-log-settings,#page-spy-clear-logs{',
    );
  }
  if (next.includes('(()=>{var _btnDl=document.createElement("button");') && !next.includes('(()=>{' + 'if(typeof window.__pageSpyLoadDeviceLogs')) {
    next = next.replace(
      '(()=>{var _btnDl=document.createElement("button");',
      '(()=>{' + DEVICE_LOGGER_LOAD + ';var _btnDl=document.createElement("button");',
    );
  }
  // Capture from SDK render (app init). The loader used to wait until See logs.
  const EARLY_CAPTURE =
    'if(!window.__pageSpyEarlyCapture){window.__pageSpyEarlyCapture=1;window.__pageSpyEarlyLogs=[];["debug","info","log","warn","error"].forEach(function(level){var current=console[level];if(!current||current.__pageSpyEarly)return;var original=current.bind(console);var wrapped=function(){try{window.__pageSpyEarlyLogs.push({level:level,args:Array.prototype.slice.call(arguments),time:Date.now()})}catch(err){}return original.apply(console,arguments)};wrapped.__pageSpyEarly=1;wrapped.__pageSpyOriginal=original;console[level]=wrapped});}';
  const LOADER_READY = 'return window.__pageSpyDeviceLoggerPromise}};';
  const LOADER_BOOT = LOADER_READY + EARLY_CAPTURE + 'window.__pageSpyLoadDeviceLogs();';
  if (next.includes(LOADER_READY) && !next.includes('window.__pageSpyEarlyCapture=1')) {
    next = next.replace(LOADER_READY, LOADER_BOOT);
  }

  // 7. Spy Tobank styling for the SDK modal, float button and footer buttons.
  // Always rewritten so older patched files pick up the current tokens.
  next = next.replace('_btnClear.style.color="#b42318";', '');
  const styleStart = next.indexOf('_st.textContent=');
  const styleEnd = styleStart < 0 ? -1 : next.indexOf(';h.appendChild(_st);', styleStart);
  if (styleStart < 0 || styleEnd < 0) {
    throw new Error(`SDK style injection anchor not found in ${filePath}`);
  }
  next =
    next.slice(0, styleStart) +
    '_st.textContent=' +
    JSON.stringify(buildSdkCss()) +
    next.slice(styleEnd);

  // 8. Forward every "public-data" message to the on-device logger so testers
  // can upload what happened since they last cleared. The DataHarbor plugin is
  // not loaded in the app_studio runtime, so the SDK itself is the only source.
  const PUBLIC_DATA_ANCHOR = 'dispatchEvent(e,t){var r;["public-data"].includes(e)?';
  const PUBLIC_DATA_FORWARD =
    'dispatchEvent(e,t){var r;if("public-data"===e)try{window.PageSpyClientLogs&&window.PageSpyClientLogs.onPublicData&&window.PageSpyClientLogs.onPublicData(t)}catch(_e){}["public-data"].includes(e)?';
  if (!next.includes(PUBLIC_DATA_FORWARD)) {
    if (!next.includes(PUBLIC_DATA_ANCHOR)) {
      throw new Error(`socketStore.dispatchEvent anchor not found in ${filePath}`);
    }
    next = next.replace(PUBLIC_DATA_ANCHOR, PUBLIC_DATA_FORWARD);
  }

  const MODAL_SHOW = 'eventBus.dispatchEvent(new Event("modal:show"))';
  const MODAL_SHOW_WINDOW =
    'eventBus.dispatchEvent(new Event("modal:show")),window.dispatchEvent(new Event("modal:show"))';
  if (!next.includes(MODAL_SHOW_WINDOW)) {
    if (!next.includes(MODAL_SHOW)) {
      throw new Error(`modal:show anchor not found in ${filePath}`);
    }
    next = next.replace(MODAL_SHOW, MODAL_SHOW_WINDOW);
  }

  // Float button starts at the Material end/bottom corner (16px + safe area).
  // A saved drag point is ignored so a resized window cannot park it off screen.
  // The edge-dock hide is disabled so the button cannot slide out of view.
  const LOGO_RESTORE =
    'const t=localStorage.getItem(POSITION_CACHE_ID);if(t){const[r,n]=t.split(",");+r<window.innerWidth&&+n<window.innerHeight&&(e.style.left="".concat(r,"px"),e.style.top="".concat(n,"px"))}';
  const LOGO_DEFAULT =
    'try{localStorage.removeItem(POSITION_CACHE_ID)}catch(err){}e.style.left="auto",e.style.top="auto",e.style.right="16px",e.style.bottom="calc(16px + env(safe-area-inset-bottom))",e.disableHidden=!0,window.addEventListener("resize",(function(){var box=e.getBoundingClientRect();if(box.width&&(box.left<0||box.top<0||box.right>window.innerWidth||box.bottom>window.innerHeight)){e.style.left="auto",e.style.top="auto",e.style.right="16px",e.style.bottom="calc(16px + env(safe-area-inset-bottom))"}}));';
  if (!next.includes('e.style.bottom="calc(16px + env(safe-area-inset-bottom))"')) {
    if (!next.includes(LOGO_RESTORE)) {
      throw new Error(`float button position anchor not found in ${filePath}`);
    }
    next = next.replace(LOGO_RESTORE, LOGO_DEFAULT);
  }
  const LOGO_HIDE = 'e.disableHidden||(t<=0?e.classList.add("hidden-in-left")';
  const LOGO_HIDE_OFF = '1||(t<=0?e.classList.add("hidden-in-left")';
  if (next.includes(LOGO_HIDE)) {
    next = next.replace(LOGO_HIDE, LOGO_HIDE_OFF);
  }
  // Idle: tuck halfway off the nearest edge at 50% opacity until the user touches it.
  const IDLE_MARK = 'e.__pageSpyIdle=1';
  const IDLE_BOOT = '(function(){if(e.__pageSpyIdle)return;e.__pageSpyIdle=1;var idleTimer=null,pointerDown=0;var dock=function(){if(pointerDown)return;var box=e.getBoundingClientRect();if(!box.width)return;var half=box.width/2;var dLeft=box.left,dRight=window.innerWidth-box.right,dTop=box.top,dBottom=window.innerHeight-box.bottom;var x=0,y=0;if(Math.min(dLeft,dRight)<=Math.min(dTop,dBottom)){x=dLeft<=dRight?-(dLeft+half):(dRight+half)}else{y=dTop<=dBottom?-(dTop+half):(dBottom+half)}e.style.setProperty("--page-spy-idle-x",x+"px");e.style.setProperty("--page-spy-idle-y",y+"px");e.classList.add("page-spy-idle")};var arm=function(){clearTimeout(idleTimer);idleTimer=setTimeout(dock,1600)};var wake=function(){e.classList.remove("page-spy-idle");arm()};e.addEventListener("pointerenter",wake);e.addEventListener("pointerdown",function(){pointerDown=1;wake()});e.addEventListener("pointerup",function(){pointerDown=0;arm()});e.addEventListener("pointercancel",function(){pointerDown=0;arm()});e.addEventListener("pointerleave",function(){if(!pointerDown)arm()});arm()})()';
  if (next.includes('e.disableHidden=!0') && !next.includes(IDLE_MARK)) {
    next = next.replace('e.disableHidden=!0', 'e.disableHidden=!0,' + IDLE_BOOT, 1);
  }

  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`patched ${filePath}`);
  } else {
    console.log(`already patched ${filePath}`);
  }
  publishDeviceLogger(filePath);
}

async function selfTest() {
  const json = new TextEncoder().encode(
    '{"status":{"code":"PROCESS-10005"},"name":"علی"}',
  );
  const decoded = formatBinaryRequestBody(json);
  if (!decoded.includes('PROCESS-10005') || !decoded.includes('علی')) {
    throw new Error(`json body lost: ${decoded}`);
  }

  const multipart = [
    '----dio-boundary-1',
    'content-disposition: form-data; name="nationalCode"',
    '',
    '0013339959',
    '----dio-boundary-1',
    'content-disposition: form-data; name="file"; filename="face.jpg"',
    'content-type: image/jpeg',
    '',
    'XXXX',
    '----dio-boundary-1--',
    '',
  ].join('\r\n');
  const fields = formatBinaryRequestBody(new TextEncoder().encode(multipart));
  if (!Array.isArray(fields)) throw new Error('multipart was not fields');
  const national = fields.find((pair) => pair[0] === 'nationalCode');
  const file = fields.find((pair) => pair[0] === 'file');
  if (!national || national[1] !== '0013339959') {
    throw new Error(`text field lost: ${JSON.stringify(fields)}`);
  }
  if (!file || !String(file[1]).includes('face.jpg')) {
    throw new Error(`file field lost: ${JSON.stringify(fields)}`);
  }

  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x03]);
  const binary = formatBinaryRequestBody(jpeg);
  if (binary !== '[binary 7 bytes]') {
    throw new Error(`binary not summarized: ${binary}`);
  }

  // Test Blob formatting
  const mockJsonBlob = {
    size: json.length,
    arrayBuffer: async () => json.buffer,
  };
  const jsonFromBlob = await formatBlobRequestBody(mockJsonBlob);
  if (!jsonFromBlob.includes('PROCESS-10005')) {
    throw new Error(`json blob lost: ${jsonFromBlob}`);
  }

  // Test File formatting
  const mockFile = {
    name: 'avatar.jpg',
    type: 'image/jpeg',
    size: 2048,
  };
  const filePlaceholder = await formatBlobRequestBody(mockFile);
  if (filePlaceholder !== '(file name=avatar.jpg type=image/jpeg size=2048)') {
    throw new Error(`file blob placeholder unexpected: ${filePlaceholder}`);
  }

  // Test Response Blob formatting
  const mockBigVideo = {
    type: 'video/mp4',
    size: 1628834,
  };
  const bigVideoResp = await formatResponseBlob(mockBigVideo);
  if (bigVideoResp.response !== '[video/mp4 1628834 bytes]') {
    throw new Error(`big video response unexpected: ${JSON.stringify(bigVideoResp)}`);
  }

  console.log('sdk body self-test ok');
}




const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  await selfTest();
} else {
  const target = args[0] || 'public/page-spy/index.min.js';
  patchSdk(target);
}

