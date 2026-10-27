const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizeDart, collectDart, amount, validFilings, collectFilings, boundedText} = require('../server/financials.cjs');
const {createHandler} = require('../api/financial-research.js');
const request = {corpCode:'00126380', year:'2025', report:'11011', basis:'CFS'};
const row = {corp_code:request.corpCode,bsns_year:'2025',reprt_code:'11011',currency:'KRW',
  rcept_no:'20260310000001',account_id:'ifrs-full_Revenue',account_detail:'-',sj_div:'IS',
  thstrm_amount:'1,000',frmtrm_amount:'900'};
const payload = rows => ({status:'000',list:rows});
test('missing amounts are unknown, not zero',()=>{
  for(const v of ['', '-', null, 'NaN', 'Infinity', '1e99']) assert.equal(amount(v),null);
  assert.equal(amount('0'),0);assert.equal(amount('-1,000'),-1000);
});
test('snapshot availability cannot be backdated to receipt date',()=>{
  const data=normalizeDart(payload([row]),request,'2026-10-21T10:00:00Z');
  assert.equal(data.metrics.revenue,1000);assert.equal(data.previous.revenue,900);
  assert.equal(data.usableFrom,'2026-10-21T10:00:00.000Z');
  assert.equal(data.historicalBacktestAllowed,false);assert.equal(data.metrics.equity,null);
});
test('conflicting accounts are not silently chosen or summed',()=>{
  const data=normalizeDart(payload([row,{...row,thstrm_amount:'2000'}]),request,'2026-10-21');
  assert.equal(data.metrics.revenue,null);assert.equal(data.conflicts.length,1);
});
test('unknown currencies and mixed identities fail closed',()=>{
  for(const change of [{currency:'UNKNOWN'},{corp_code:'00000000'},{bsns_year:'2024'}])
    assert.throws(()=>normalizeDart(payload([{...row,...change}]),request,'2026-10-21'));
  assert.throws(()=>normalizeDart(payload([row,{...row,currency:'USD'}]),request,'2026-10-21'));
  const usd=normalizeDart(payload([{...row,currency:'USD'}]),request,'2026-10-21');
  assert.equal(usd.currency,'USD');assert.equal(usd.unit,'USD');assert.equal(usd.metrics.revenue,1000);
});
test('interim cumulative flow never falls back to single-quarter amount',()=>{
  const data=normalizeDart(payload([{...row,reprt_code:'11012'}]),{...request,report:'11012'},'2026-10-21');
  assert.equal(data.metrics.revenue,null);
});
test('invalid collection timestamp and conflicting receipts fail',()=>{
  assert.throws(()=>normalizeDart(payload([row]),request,'invalid'));
  assert.throws(()=>normalizeDart(payload([row,{...row,rcept_no:'20261001000002'}]),request,'2026-10-21'));
});
test('upstream error never echoes URL or API key',async()=>{
  const key='a'.repeat(40);
  await assert.rejects(collectDart(request,key,async url=>{throw new Error(String(url))}),
    error=>error.message==='FINANCIAL_UPSTREAM_UNAVAILABLE'&&!String(error).includes(key));
});
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(b){this.body=b;return this}}}
test('operator authentication occurs before upstream access',async()=>{
  let calls=0;const h=createHandler({DART_API_KEY:'a'.repeat(40),FINANCIAL_RESEARCH_TOKEN:'b'.repeat(32)},async()=>{calls++});
  for(const header of [undefined,'Bearer wrong']) {const r=res();await h({method:'POST',headers:{authorization:header},body:request},r);assert.equal(r.code,401);}
  assert.equal(calls,0);
});
test('missing key and request fields never fall back to public proxy',async()=>{
  const token='b'.repeat(32),headers={authorization:'Bearer '+token};
  const r=res();await createHandler({FINANCIAL_RESEARCH_TOKEN:token})({method:'POST',headers,body:request},r);
  assert.equal(r.code,503);
  for(const body of [{...request,url:'https://other'},{...request,corpCode:'../secret'},{...request,basis:'ANY'}]){
    const r=res();await createHandler({FINANCIAL_RESEARCH_TOKEN:token,DART_API_KEY:'a'.repeat(40)})({method:'POST',headers,body},r);assert.equal(r.code,400);
  }
});
test('valid operator receives normalized data, not credentials',async()=>{
  const token='b'.repeat(32),r=res();
  const h=createHandler({FINANCIAL_RESEARCH_TOKEN:token,DART_API_KEY:'a'.repeat(40)},async b=>({corpCode:b.corpCode}));
  await h({method:'POST',headers:{authorization:'Bearer '+token},body:request},r);
  assert.equal(r.code,200);assert.deepEqual(r.body,{corpCode:request.corpCode});assert.equal(r.headers['Cache-Control'],'private, no-store');
});

test('interim cash flow is cumulative without income-only add fields',()=>{
  const r={...row,reprt_code:'11012',account_id:'ifrs-full_CashFlowsFromUsedInOperatingActivities',
    sj_div:'CF',thstrm_amount:'400',frmtrm_q_amount:'300',frmtrm_amount:'900'};
  const data=normalizeDart(payload([r]),{...request,report:'11012'},'2026-10-21');
  assert.equal(data.metrics.operatingCashFlow,400);assert.equal(data.previous.operatingCashFlow,300);
});
test('filing request is bounded and validates calendar dates',()=>{
  const b={action:'filings',start:'20260801',end:'20261021',page:1,market:'Y'};
  assert.equal(validFilings(b),true);
  for(const change of [{start:'20260230'},{start:'20250101'},{page:0},{market:'O'},{url:'https://other'}])
    assert.equal(validFilings({...b,...change}),false);
  for(const market of ['Y','K','N','E'])assert.equal(validFilings({...b,market}),true);
});
test('unlisted filing class remains explicit and never invents a stock code',async()=>{
  const b={action:'filings',start:'20230301',end:'20230331',page:1,market:'E',reportType:'A001'};
  const body={status:'000',total_count:1,total_page:1,page_no:1,list:[{corp_code:'00100001',
    stock_code:'',corp_cls:'E',rcept_no:'20230320000001',rcept_dt:'20230320',report_nm:'Annual'}]};
  const r=await collectFilings(b,'a'.repeat(40),async url=>{
    assert.equal(new URL(url).searchParams.get('corp_cls'),'E');
    return new Response(JSON.stringify(body));
  });
  assert.equal(r.records[0].stockCode,'');assert.equal(r.records[0].market,'E');
});
test('filing listing exposes only normalized public metadata',async()=>{
  const b={action:'filings',start:'20260801',end:'20261021',page:1,market:'Y'};
  const body={status:'000',total_count:1,total_page:1,page_no:1,list:[{corp_code:'00126380',
    stock_code:'005930',corp_cls:'Y',rcept_no:'20260814000001',rcept_dt:'20260814',report_nm:'Half year',secret:'must not escape'}]};
  const r=await collectFilings(b,'a'.repeat(40),async()=>({ok:true,text:async()=>JSON.stringify(body)}));
  assert.equal(r.records.length,1);assert.equal(r.records[0].secret,undefined);
});
test('oversized body and no-data handling are safe',async()=>{
  await assert.rejects(boundedText(new Response('x'.repeat(20)),10));
  const r=await collectDart(request,'a'.repeat(40),async()=>new Response('{"status":"013"}'));
  assert.equal(r.status,'NO_DATA');assert.equal(r.metrics,undefined);
});
test('known data rejection stays distinct from transport failure without echoing data',async()=>{
  await assert.rejects(collectDart(request,'a'.repeat(40),async()=>new Response(JSON.stringify(payload([{...row,currency:'UNKNOWN'}])))),
    error=>error.message==='FINANCIAL_IDENTITY_OR_CURRENCY_MISMATCH');
  const token='b'.repeat(32),r=res();
  const h=createHandler({FINANCIAL_RESEARCH_TOKEN:token,DART_API_KEY:'a'.repeat(40)},async()=>{throw new Error('AMBIGUOUS_FINANCIAL_RECEIPT')});
  await h({method:'POST',headers:{authorization:'Bearer '+token},body:request},r);
  assert.equal(r.code,422);assert.deepEqual(r.body,{error:'AMBIGUOUS_FINANCIAL_RECEIPT'});
});
