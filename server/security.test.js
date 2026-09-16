const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const config = require('./config');
const { readJsonBody, writeAuthorized, queryLimit, HttpError, MAX_BODY_BYTES } = require('./index');
const { assertHttps, privateAddress } = require('./http');

function request({ address = '203.0.113.5', origin, authorization } = {}) {
  return { socket: { remoteAddress: address }, headers: { ...(origin ? { origin } : {}), ...(authorization ? { authorization } : {}) } };
}

test('state-changing API requests require a token outside loopback', () => {
  const original = config.apiWriteToken;
  config.apiWriteToken = 'test-write-token';
  assert.equal(writeAuthorized(request()), false);
  assert.equal(writeAuthorized(request({ authorization: 'Bearer wrong' })), false);
  assert.equal(writeAuthorized(request({ authorization: 'Bearer test-write-token' })), true);
  assert.equal(writeAuthorized(request({ address: '127.0.0.1', origin: 'http://localhost:3000' })), true);
  config.apiWriteToken = original;
});

test('request body limit is enforced while streaming', async () => {
  const stream = Readable.from([Buffer.alloc(MAX_BODY_BYTES), Buffer.from('x')]);
  await assert.rejects(readJsonBody(stream), error => error instanceof HttpError && error.status === 413);
});

test('public query limits are bounded', () => {
  assert.equal(queryLimit('100000'), 500);
  assert.throws(() => queryLimit('-1'), /positive integer/);
});

test('outbound URL checks require HTTPS and identify private addresses', () => {
  assert.throws(() => assertHttps('http://example.com'), /HTTPS/);
  assert.throws(() => assertHttps('https://user:pass@example.com'), /credentials/);
  assert.equal(privateAddress('127.0.0.1'), true);
  assert.equal(privateAddress('192.168.1.10'), true);
  assert.equal(privateAddress('8.8.8.8'), false);
});
