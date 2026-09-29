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
