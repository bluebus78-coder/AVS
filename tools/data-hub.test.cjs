const test=require('node:test'),assert=require('node:assert/strict');
const {createHub}=require('../server/data-hub.cjs');
const {requestSpec,collect}=require('../server/data-sources.cjs');
const input={source:'dart',params:{corpCode:'00126380',year:'2025',report:'11011',basis:'CFS'}};
function fixture(){
  const rows=new Map(),leases=new Set();let now=Date.now(),calls=0,budget=true;
  const store={read:async k=>rows.get(k),budget:async()=>budget,claim:async k=>leases.has(k)?null:(leases.add(k),'owner'),
    save:async(k,o,p,c,t)=>{rows.set(k,{payload:p,checksum:c,collected_at:new Date(now).toISOString(),expires_at:new Date(now+t*1000).toISOString()});leases.delete(k);},
    fail:async k=>leases.delete(k)};
  return {rows,leases,store,clock:()=>now,advance:n=>now+=n,setBudget:b=>budget=b,
    collector:async()=>{calls++;return {kind:'financial',data:{metrics:{revenue:123}}};},calls:()=>calls};
}
test('persisted data reused by independent hub instances, same payload checksum',async()=>{
  const f=fixture(),first=await createHub(f.store,f.collector,f.clock).read(input);
  const second=await createHub(f.store,f.collector,f.clock).read(input);
  assert.equal(f.calls(),1);assert.equal(second.status,'fresh_cache');assert.deepEqual(first.payload,second.payload);assert.equal(first.checksum,second.checksum);
});
test('expiry refreshes once, failure retains old data with stale status',async()=>{
  const f=fixture();await createHub(f.store,f.collector,f.clock).read(input);f.advance(86401000);
  const result=await createHub(f.store,async()=>{throw Error('timeout');},f.clock).read(input);
  assert.equal(result.status,'stale_upstream_unavailable');assert.equal(result.payload.data.metrics.revenue,123);assert.equal(f.leases.size,0);
});
test('daily budget never creates unlimited new cache rows',async()=>{
  const f=fixture();f.setBudget(false);await assert.rejects(createHub(f.store,f.collector,f.clock).read(input),/BUDGET/);assert.equal(f.leases.size,0);assert.equal(f.calls(),0);
});
test('parallel cold requests perform one upstream call',async()=>{
  const f=fixture(),hub=createHub(f.store,async()=>{await new Promise(r=>setTimeout(r,10));return f.collector();},f.clock);
  const results=await Promise.all([hub.read(input),hub.read(input)]);assert.equal(f.calls(),1);assert.ok(results.some(r=>r.status==='pending'));
});
test('schema is closed and cannot forward arbitrary URLs or credentials',()=>{
  for(const x of [{...input,url:'http://localhost/'},{source:'unknown',params:{}},{source:'__proto__',params:{code:'005930'}},{...input,params:{...input.params,api_key:'hidden'}},{source:'naver_company',params:{code:'../etc'}}]) assert.throws(()=>requestSpec(x));
});
test('parameter order produces one identity',()=>{
  assert.deepEqual(requestSpec(input),requestSpec({source:'dart',params:{basis:'CFS',report:'11011',year:'2025',corpCode:'00126380'}}));
});
test('financial periods and statement bases are not conflated',()=>{
  assert.notDeepEqual(requestSpec(input),requestSpec({...input,params:{...input.params,basis:'OFS'}}));
});
test('approved public-data centralization has no extra disabled-by-default switch',async()=>{
  const body=JSON.stringify({itemCode:'005930',totalInfos:[{code:'per',value:'12.34'}],stockName:'test'.repeat(20)});
  const response=await collect(requestSpec({source:'naver_integration',params:{code:'005930'}}),{},async()=>new Response(body));
  assert.equal(response.kind,'http');
});
test('raw bytes and encoding preserved',async()=>{
  const body=Buffer.from('<html><table>'+ 'financial'.repeat(25)+'</table></html>');
  const result=await collect(requestSpec({source:'naver_company',params:{code:'005930'}}),{AVS_SHARED_MARKET_DATA:'approved'},async()=>new Response(body,{headers:{'content-type':'text/html; charset=EUC-KR'}}));
  assert.deepEqual(Buffer.from(result.body,'base64'),body);assert.match(result.contentType,/EUC-KR/);assert.equal(result.body_sha256.length,64);
});
test('failed upstream never replaces known data',async()=>{
  await assert.rejects(collect(requestSpec({source:'naver_company',params:{code:'005930'}}),{AVS_SHARED_MARKET_DATA:'approved'},async()=>new Response('',{status:429})),/UPSTREAM/);
});
