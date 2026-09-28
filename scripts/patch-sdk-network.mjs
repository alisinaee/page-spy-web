import fs from 'node:fs';

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
  const PAGE_PLUGIN_NEW = 'class PagePlugin{constructor(){_defineProperty(this,"name","PagePlugin"),_defineProperty(this,"$pageSpyConfig",null)}onInit(e){let{config:t}=e;if(!PagePlugin.hasInitd){PagePlugin.hasInitd=!0,this.$pageSpyConfig=t;const send=(cb)=>{var o,a;const e=PagePlugin.collectHtml();if(!1===(null===(o=this.$pageSpyConfig)||void 0===o||null===(o=o.dataProcessor)||void 0===o||null===(a=o.page)||void 0===a?void 0:a.call(o,e)))return;const r=makeMessage("page",e);socketStore.dispatchEvent("public-data",r);if(typeof cb==="function"){cb(r)}else{socketStore.broadcastMessage(r)}};socketStore.addListener("refresh",((e,t)=>{let{source:r}=e;const{data:n}=r;if("page"===n){send(t)}}));socketStore.addListener("debugger-online",(()=>{send()}));socketStore.addListener("harbor-clear",(()=>{send()}));send();}}onReset(){PagePlugin.hasInitd=!1}static collectHtml(){return{html:document.documentElement?document.documentElement.outerHTML:"",location:window.location?{href:window.location.href,origin:window.location.origin,protocol:window.location.protocol,host:window.location.host,hostname:window.location.hostname,port:window.location.port,pathname:window.location.pathname,search:window.location.search,hash:window.location.hash}:null}}}';

  if (next.includes(PAGE_PLUGIN_OLD)) {
    next = next.replace(PAGE_PLUGIN_OLD, PAGE_PLUGIN_NEW);
  } else if (!next.includes(PAGE_PLUGIN_NEW)) {
    throw new Error(`PagePlugin definition not found in ${filePath}`);
  }

  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`patched ${filePath}`);
  } else {
    console.log(`already patched ${filePath}`);
  }
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

