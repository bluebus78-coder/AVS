const test=require('node:test');
const assert=require('node:assert/strict');
const {validRequest,normalize,collect,cachedCollector}=require('../server/krx-research.cjs');
const {createHandler}=require('../api/krx-research.js');
const b={action:'daily',market:'KOSPI',date:'20251020'};
const token='t'.repeat(40),key='k'.repeat(40);
const row={BAS_DD:b.date,ISU_CD:'005930',ISU_NM:'Samsung',MKT_NM:'KOSPI',SECT_TP_NM:'-',
 TDD_CLSPRC:'70000',CMPPREVDD_PRC:'1000',FLUC_RT:'1.45',TDD_OPNPRC:'69000',TDD_HGPRC:'71000',
 TDD_LWPRC:'68000',ACC_TRDVOL:'1000',ACC_TRDVAL:'70000000',MKTCAP:'400000000000000',LIST_SHRS:'5000000000'};
const response=rows=>new Response(JSON.stringify({OutBlock_1:rows}));
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(b){this.body=b;return this}});
test('dates and datasets strictly bounded, no URL injection',()=>{
 assert.equal(validRequest(b),true);
 for(const extra of [{date:'20250230'},{date:'20990101'},{date:'20090101'},{market:'ANY'},
 {action:'__proto__'},{url:'https://other'},{date:20251020}])assert.equal(validRequest({...b,...extra}),false);
});
test('auth before upstream and missing key fail closed',async()=>{
 let calls=0;const h=createHandler({KRX_API_KEY:key,FINANCIAL_RESEARCH_TOKEN:token},async()=>{calls++});
 const r=res();await h({method:'POST',body:b,headers:{}},r);assert.equal(r.code,401);assert.equal(calls,0);
 const r2=res();await createHandler({FINANCIAL_RESEARCH_TOKEN:token})({method:'POST',body:b,headers:{authorization:'Bearer '+token}},r2);assert.equal(r2.code,503);
});
test('upstream credential stays header-only, fixed host and no redirects',async()=>{
 const out=await collect(b,key,async(url,options)=>{
  assert.equal(url.origin,'https://data-dbg.krx.co.kr');assert.equal(url.pathname,'/svc/apis/sto/stk_bydd_trd');
  assert.equal(url.searchParams.get('basDd'),b.date);assert.ok(!url.href.includes(key));
  assert.equal(options.headers.AUTH_KEY,key);assert.equal(options.redirect,'error');return response([row]);
 });assert.equal(out.records[0].MKTCAP,row.MKTCAP);assert.equal(out.adjustedPriceCertified,false);
 assert.equal(out.priceBasis,'UNADJUSTED_DAILY');assert.ok(!JSON.stringify(out).includes(key));
});
test('empty table not zero prices; malformed table not no-data',()=>{
 assert.equal(normalize({OutBlock_1:[]},b,'now').status,'NO_DATA');
 assert.throws(()=>normalize({error:'not approved'},b,'now'));
});
test('identity, date, duplicate and missing-field rejection',()=>{
 for(const rows of [[{...row,ISU_CD:'../x'}],[{...row,BAS_DD:'20251019'}],
 [{...row,MKT_NM:'KOSDAQ'}],[row,row],[{...row,TDD_CLSPRC:undefined}]])
 assert.throws(()=>normalize({OutBlock_1:rows},b,'now'));
});
test('upstream auth/quota/status/body/timeout sanitized',async()=>{
 for(const [status,expected] of [[401,'KRX_KEY_UNAUTHORIZED'],[403,'KRX_SERVICE_FORBIDDEN'],
 [429,'KRX_QUOTA_EXCEEDED'],[500,'KRX_UPSTREAM_HTTP_ERROR']])
 await assert.rejects(collect(b,key,async()=>new Response(key,{status})),{message:expected});
 await assert.rejects(collect(b,key,async()=>{throw new Error(key)}),{message:'KRX_UPSTREAM_UNAVAILABLE'});
 await assert.rejects(collect(b,key,async()=>new Response('<html>'+key)),{message:'KRX_INVALID_RESPONSE'});
 await assert.rejects(collect(b,key,async()=>new Response(JSON.stringify({respCode:'401',respMsg:key}))),{message:'KRX_KEY_UNAUTHORIZED'});
});
test('operator success keeps private no-store; methods and invalid bodies rejected',async()=>{
 const h=createHandler({KRX_API_KEY:key,FINANCIAL_RESEARCH_TOKEN:token},async()=>({status:'OK'}));
 for(const [method,body,status] of [['POST',b,200],['GET',b,405],['POST',{...b,url:'x'},400]]) {
 const r=res();await h({method,body,headers:{authorization:'Bearer '+token}},r);assert.equal(r.code,status);
 assert.equal(r.headers['Cache-Control'],'private, no-store');}
});
test('cache coalesces repeated authorized reads',async()=>{
 let calls=0;const c=cachedCollector(async()=>{calls++;return response([row]);});
 const first=await c(b,key),second=await c(b,key);assert.deepEqual(first,second);assert.equal(calls,1);
 await assert.rejects(c({...b,date:'20251021'},key),{message:'KRX_LOCAL_THROTTLED'});
});
