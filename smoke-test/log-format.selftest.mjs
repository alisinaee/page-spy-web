import { buildCurlCommand, redactSecrets, shellQuote } from './log-format.js';

const assert = (cond, message) => {
  if (!cond) throw new Error(message);
};

const jsonCurl = buildCurlCommand({
  url: 'https://example.test/echo',
  method: 'POST',
  requestHeader: [
    ['content-type', 'application/json'],
    ['host', 'example.test'],
    ['content-length', '12'],
    ['authorization', "Bearer it's-a-token"],
  ],
  requestPayload: '{"ok":true}',
});
assert(jsonCurl.includes("--data-raw '{\"ok\":true}'"), jsonCurl);
assert(!jsonCurl.includes('content-length'), jsonCurl);
assert(!jsonCurl.includes("host:"), jsonCurl);
assert(jsonCurl.includes("Bearer it'\\''s-a-token"), jsonCurl);

const multipart = buildCurlCommand({
  url: 'https://example.test/upload',
  method: 'POST',
  requestHeader: [
    ['content-type', 'multipart/form-data; boundary=--dio'],
    ['content-length', '9'],
  ],
  requestPayload: [
    ['note', 'hello'],
    ['file', '(file name=face video.mp4 type=video/mp4 size=12)'],
    ['raw', '(file size=4)'],
  ],
});
assert(!multipart.toLowerCase().includes('content-type'), multipart);
assert(multipart.includes("--form 'file=@face video.mp4'"), multipart);
assert(multipart.includes('# file not captured: raw'), multipart);
assert(multipart.includes("--form 'note=hello'"), multipart);

const lost = buildCurlCommand({
  url: 'https://example.test/lost',
  method: 'POST',
  requestPayload: '[object TypedArray]',
});
assert(lost.includes('# body not captured: [object TypedArray]'), lost);
assert(!lost.includes('--data-raw'), lost);

assert(shellQuote("a'b") === "'a'\\''b'", shellQuote("a'b"));

const redacted = redactSecrets({
  requestHeader: [
    ['authorization', 'Bearer live'],
    ['accept', 'application/json'],
  ],
  response: { authorization: 'keep-me', ok: true },
  storage: { cookie: 'session=abc', localStorage: [{ name: 'token', value: 'keep' }] },
});
assert(redacted.requestHeader[0][1] === '<redacted>', JSON.stringify(redacted));
assert(redacted.requestHeader[1][1] === 'application/json', JSON.stringify(redacted));
assert(redacted.response.authorization === 'keep-me', JSON.stringify(redacted));
assert(redacted.storage.cookie === '<redacted>', JSON.stringify(redacted));
assert(redacted.storage.localStorage[0].value === 'keep', JSON.stringify(redacted));

console.log('log-format self-test ok');

import { createBoxLineGrouper } from './log-format.js';

const flushed = [];
const grouper = createBoxLineGrouper((item) => flushed.push(item));

// 1. Separate feed() calls for GO_ROUTE box: start line, content line with |, end line.
grouper.feed('\x1b[38;5;4m┌───────────────────────────────────────────────────────────\x1b[0m', { level: 'log' });
grouper.feed('\x1b[38;5;4m│ [GO_ROUTE] | 8:28:32 726ms | operation=pop location=null name=null query={}\x1b[0m', { level: 'log' });
grouper.feed('└───────────────────────────────────────────────────────────', { level: 'log' });

// 2. Separate feed() calls for a JSON box
grouper.feed('\x1b[38;5;4m┌───────────────────────────────────────────────────────────\x1b[0m', { level: 'log' });
grouper.feed('│ {', { level: 'log' });
grouper.feed('│   "ok": true', { level: 'log' });
grouper.feed('│ }', { level: 'log' });
grouper.feed('\x1b[38;5;4m└───────────────────────────────────────────────────────────\x1b[0m', { level: 'log' });

// 3. While a box is open, feed normal line with | pipe at level warn
grouper.feed('┌───────────────────────────────────────────────────────────', { level: 'log' });
grouper.feed('│ box content before pipe', { level: 'log' });
grouper.feed('normal line with | pipe', { level: 'warn' });

// 4. Normal line: 0
grouper.feed(0, { level: 'info' });

// 5. Normal line: false
grouper.feed(false, { level: 'log' });

// 6. Warning with no box
grouper.feed('warning without box', { level: 'warn' });

grouper.flush();

assert(flushed.length === 7, 'Expected 7 items, got ' + flushed.length);

// Assertions for GO_ROUTE box: includes [GO_ROUTE] and |, and includes no ┌, └, or │
assert(flushed[0].message.includes('[GO_ROUTE]'), flushed[0].message);
assert(flushed[0].message.includes('|'), flushed[0].message);
assert(!flushed[0].message.includes('┌'), flushed[0].message);
assert(!flushed[0].message.includes('└'), flushed[0].message);
assert(!flushed[0].message.includes('│'), flushed[0].message);

// Assertions for JSON box: stored message still has the two-space indent before "ok", and no │
assert(flushed[1].message.includes('  "ok": true'), flushed[1].message);
assert(!flushed[1].message.includes('│'), flushed[1].message);

// Assertions for open box flush on normal line with | pipe
assert(flushed[2].message === 'box content before pipe', flushed[2].message);
assert(flushed[3].message === 'normal line with | pipe', flushed[3].message);
assert(flushed[3].level === 'warn', flushed[3].level);

// Number 0 and false stay their own items
assert(flushed[4].message === '0', flushed[4].message);
assert(flushed[4].level === 'info', flushed[4].level);
assert(flushed[5].message === 'false', flushed[5].message);
assert(flushed[5].level === 'log', flushed[5].level);

// Warning with no box stays its own item
assert(flushed[6].message === 'warning without box', flushed[6].message);
assert(flushed[6].level === 'warn', flushed[6].level);

console.log('box line grouper self-test ok');
