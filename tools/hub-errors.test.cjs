const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHandler} = require('../api/data-hub.js');

async function failure(message, source = 'naver_integration') {
  const response = {headers: {}, setHeader(k, v) {this.headers[k] = v;},
    status(n) {this.code = n; return this;}, json(body) {this.body = body; return this;}};
  const handler = createHandler(() => ({read: async () => {throw Error(message);}}));
  await handler({method: 'POST', body: {source, params: {code: '00680K'}}}, response);
  return response;
}

test('budget exhaustion is retryable throttling, not an unexplained service error', async () => {
  const result = await failure('COLLECTION_BUDGET_EXHAUSTED');
  assert.equal(result.code, 429);
  assert.equal(result.body.reason, 'COLLECTION_BUDGET_EXHAUSTED');
  assert.ok(+result.headers['Retry-After'] > 0);
});

test('malformed source cannot throw from safe failure logging', async () => {
  const result = await failure('sensitive internal error', {toString: 1, valueOf: 1});
  assert.equal(result.code, 400);
  assert.equal(result.body.error, 'INVALID_REQUEST');
});

test('upstream failures and unknown failures are safe and distinct', async () => {
  const upstream = await failure('INVALID_UPSTREAM');
  assert.equal(upstream.code, 502);
  assert.equal(upstream.body.reason, 'INVALID_UPSTREAM');
  const unknown = await failure('postgres://secret@private-host/table');
  assert.equal(unknown.code, 503);
  assert.equal(unknown.body.reason, 'DATA_UNAVAILABLE');
  assert.ok(!JSON.stringify(unknown.body).includes('secret'));
});
