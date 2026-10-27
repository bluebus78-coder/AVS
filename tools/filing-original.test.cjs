const test = require('node:test');
const assert = require('node:assert/strict');
const {validOriginal, collectOriginal} = require('../server/filing-original.cjs');
const {collectDart} = require('../server/financials.cjs');
const req = {action:'original', receiptId:'20250311001010', report:'11011', kind:'xbrl', offset:0};
test('original input is bounded and does not accept URLs', () => {
  assert.ok(validOriginal(req));
  for (const bad of [{...req,url:'https://example.com'}, {...req,offset:1}, {...req,receiptId:'../secret'}, {...req,kind:'other'}])
    assert.equal(validOriginal(bad), false);
});
test('original chunks are hash-bound and stay below function response limit', async () => {
  const bytes = Buffer.alloc(3_200_000, 65);
  Buffer.from('504b0304','hex').copy(bytes);
  const fetcher = async url => {assert.equal(url.hostname,'opendart.fss.or.kr'); return new Response(bytes);};
  const a = await collectOriginal(req, 'x'.repeat(40), fetcher);
  const b = await collectOriginal({...req,offset:3_000_000}, 'x'.repeat(40), fetcher);
  assert.equal(a.sha256,b.sha256);
  assert.equal(a.nextOffset,3_000_000);
  assert.ok(Buffer.byteLength(JSON.stringify(a))<4_500_000);
  assert.equal(b.nextOffset,null);
  assert.deepEqual(Buffer.concat([Buffer.from(a.bytes,'base64'),Buffer.from(b.bytes,'base64')]),bytes);
});
test('DART XML errors never masquerade as a ZIP', async () => {
  await assert.rejects(collectOriginal(req,'x'.repeat(40), async()=>new Response('<result><status>014</status><message>secret</message></result>')), /DART_FILE_UNAVAILABLE/);
});
test('timeouts and rate limits have safe actionable reasons', async () => {
  await assert.rejects(collectDart({},'x'.repeat(40),async()=>{throw new DOMException('secret url','TimeoutError');}),/DART_TIMEOUT/);
  await assert.rejects(collectDart({},'x'.repeat(40),async()=>Response.json({status:'020',message:'secret'})),/DART_QUOTA_EXCEEDED/);
});
