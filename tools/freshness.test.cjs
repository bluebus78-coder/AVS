const test=require('node:test'),assert=require('node:assert/strict');
const {extraSpec}=require('../server/macro-sources.cjs');
const {createHub}=require('../server/data-hub.cjs');
test('domestic index on-demand cache is one minute without changing historical sources',()=>{
  assert.equal(extraSpec('naver_index',{code:'KOSPI',part:'basic'}).ttl,60);
  assert.equal(extraSpec('naver_index',{code:'KOSDAQ',part:'integration'}).ttl,60);
  assert.equal(extraSpec('fred',{series:'DGS10'}).ttl,3600);
  assert.equal(extraSpec('yahoo_chart',{symbol:'^GSPC',range:'3mo'}).ttl,300);
});
test('shorter TTL immediately retires older snapshots without changing the request identity',async()=>{
  let now=Date.now(),row,calls=0;
  const store={read:async()=>row,budget:async()=>true,claim:async()=> 'owner',fail:async()=>{},
    save:async(k,o,p,c,t)=>{row={payload:p,checksum:c,collected_at:new Date(now).toISOString(),expires_at:new Date(now+t*1000).toISOString()}}};
  const request={source:'naver_index',params:{code:'KOSPI',part:'basic'}};
  const collector=async()=>({count:++calls});
  const spec=ttl=>()=>({source:request.source,params:request.params,ttl});
  await createHub(store,collector,()=>now,spec(300)).read(request);
  now+=61000;
  const next=await createHub(store,collector,()=>now,spec(60)).read(request);
  assert.equal(next.status,'refreshed');assert.equal(calls,2);
});
