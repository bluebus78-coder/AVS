const test=require('node:test'),assert=require('node:assert/strict');
const krx=require('../server/krx-data.cjs');
const {requestSpec:publicSpec}=require('../server/data-sources.cjs');
const {createHandler}=require('../api/krx-data.js');
const input={source:'krx',params:{service:'stk_bydd_trd',date:'20261023'}};
const row={BAS_DD:'20261023',ISU_CD:'005930',MKT_NM:'KOSPI',ISU_NM:'Samsung',TDD_CLSPRC:'70000'};
const env={KRX_API_KEY:'k'.repeat(40),KRX_DATA_TOKEN:'t'.repeat(48)};
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(b){this.body=b;return this}});
function store(){
  const rows=new Map(),leases=new Set();return {read:async k=>rows.get(k),budget:async()=>true,
    claim:async k=>leases.has(k)?null:(leases.add(k),'owner'),fail:async k=>leases.delete(k),
    save:async(k,o,p,c,t)=>{rows.set(k,{payload:p,checksum:c,collected_at:new Date().toISOString(),expires_at:new Date(Date.now()+t*1000).toISOString()});leases.delete(k);}};
}
test('eleven services and strict date/parameter boundaries',()=>{
  assert.equal(Object.keys(krx.SERVICES).length,11);
  assert.equal(krx.requestSpec(input).params.date,'20261023');
  for(const p of [{service:'__proto__'},{date:'20260230'},{date:'20990101'},{url:'https://other'}])
    assert.throws(()=>krx.requestSpec({...input,params:{...input.params,...p}}));
  assert.throws(()=>publicSpec(input));
});
test('weekend and Korean calendar date determined in KST',()=>{
  assert.equal(krx.candidateDates(new Date('2026-10-25T15:05:00Z'))[0],'20261023');
  assert.equal(krx.candidateDates(new Date('2026-10-26T15:05:00Z'))[0],'20261026');
});
test('fixed official endpoint, header-only credential, no redirect and no key leakage',async()=>{
  const result=await krx.collect(krx.requestSpec(input),env,async(url,options)=>{
    assert.equal(url,'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd?basDd=20261023');
    assert.equal(options.headers.AUTH_KEY,env.KRX_API_KEY);assert.equal(options.redirect,'error');
    return new Response(JSON.stringify({OutBlock_1:[row]}));
  });
  assert.equal(result.data.is_realtime,false);assert.equal(result.data.owner_use_only,true);
  assert.equal(result.data.records[0].TDD_CLSPRC,'70000');assert.ok(!JSON.stringify(result).includes(env.KRX_API_KEY));
});
test('missing index prices retained as blanks, not zero or a real-time tick',()=>{
  const spec={params:{service:'kospi_dd_trd',date:'20261023'}};
  const result=krx.normalize({OutBlock_1:[{BAS_DD:'20261023',IDX_NM:'summary',CLSPRC_IDX:''},
    {BAS_DD:'20261023',IDX_NM:'KOSPI',CLSPRC_IDX:'3000'}]},spec);
  assert.equal(result.records[0].CLSPRC_IDX,'');assert.equal(result.priced_record_count,1);
});
test('wrong date/market and duplicate identities rejected',()=>{
  for(const rows of [[{...row,BAS_DD:'20261022'}],[{...row,MKT_NM:'KOSDAQ'}],[row,row]])
    assert.throws(()=>krx.normalize({OutBlock_1:rows},input));
});
test('holiday/no-data short cache and independent clients reuse one persistent snapshot',async()=>{
  const s=store();let calls=0;
  const fetcher=async()=>{calls++;return new Response(JSON.stringify({OutBlock_1:[row]}));};
  const a=await krx.createKrxHub(s,env,fetcher).read(input);
  const b=await krx.createKrxHub(s,env,fetcher).read(input);
  assert.equal(a.status,'refreshed');assert.equal(b.status,'fresh_cache');assert.equal(calls,1);
  const empty=await krx.collect(krx.requestSpec(input),env,async()=>new Response('{"OutBlock_1":[]}'));
  assert.equal(empty.cache_ttl,120);assert.equal(empty.data.status,'NO_DATA');
});
test('latest rolls back unready day; explicit date never silently substituted',async()=>{
  const hub={read:async request=>({status:'fresh_cache',payload:{data:{status:request.params.date==='20261026'?'NO_DATA':'OK'}}})};
  const result=await krx.readSnapshot(hub,'stk_bydd_trd',undefined,new Date('2026-10-27T00:00:00Z'));
  assert.equal(result.payload.data.status,'OK');
  await assert.rejects(krx.readSnapshot(hub,'stk_bydd_trd','20261026'),/KRX_NO_DATA/);
});
test('unauthorized requests do not touch database, errors contain no secrets',async()=>{
  let calls=0;const handler=createHandler(env,()=>{calls++;throw Error(env.KRX_API_KEY);});
  const r=res();await handler({method:'POST',body:{service:'stk_bydd_trd'},headers:{}},r);
  assert.equal(r.code,401);assert.equal(calls,0);
  const r2=res();await handler({method:'POST',body:{service:'stk_bydd_trd'},headers:{authorization:'Bearer '+env.KRX_DATA_TOKEN}},r2);
  assert.equal(r2.code,503);assert.equal(r2.body.error,'KRX_UPSTREAM_UNAVAILABLE');
  assert.ok(!JSON.stringify(r2).includes(env.KRX_API_KEY));
});
test('owner catalog exposes eleven services but no key; rejects account/URL injection',async()=>{
  const h=createHandler(env,()=>{throw Error('unexpected');});
  const r=res();await h({method:'GET',headers:{authorization:'Bearer '+env.KRX_DATA_TOKEN}},r);
  assert.equal(r.code,200);assert.equal(r.body.owner_use_only,true);
  const r2=res();await h({method:'POST',body:{service:'stk_bydd_trd',account_no:'secret'},headers:{authorization:'Bearer '+env.KRX_DATA_TOKEN}},r2);
  assert.equal(r2.code,400);
});
