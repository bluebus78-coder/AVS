const test=require('node:test'),assert=require('node:assert/strict');
const {requestSpec,collect}=require('../server/data-sources.cjs');
const {SYMBOLS,SERIES}=require('../server/macro-sources.cjs');
test('all existing macro symbols and FRED series have fixed public origins',()=>{
  for(const symbol of SYMBOLS) assert.equal(new URL(requestSpec({source:'yahoo_chart',params:{symbol,range:'3mo'}}).url).hostname,'query1.finance.yahoo.com');
  for(const series of SERIES) assert.equal(new URL(requestSpec({source:'fred',params:{series}}).url).hostname,'fred.stlouisfed.org');
});
test('public macro routes reject foreign symbols, keys, URLs and unsupported history',()=>{
  for(const params of [{symbol:'AAPL',range:'3mo'},{symbol:'^VIX',range:'max'},{symbol:'^VIX',range:'3mo',key:'secret'}]) assert.throws(()=>requestSpec({source:'yahoo_chart',params}));
  assert.throws(()=>requestSpec({source:'fred',params:{series:'DGS10',api_key:'secret'}}));
  assert.throws(()=>requestSpec({source:'naver_finance',params:{code:'005930',period:'../../'}}));
});
test('wrong ticker cannot become a valid cache entry',async()=>{
  const spec=requestSpec({source:'naver_integration',params:{code:'005930'}});
  await assert.rejects(collect(spec,{},async()=>new Response(JSON.stringify({itemCode:'000660',padding:'x'.repeat(150)}))),/INVALID_UPSTREAM/);
});
test('news rejects HTML error pages even when upstream returns 200',async()=>{
  const spec=requestSpec({source:'news',params:{query:'코스피 증시'}});
  await assert.rejects(collect(spec,{},async()=>new Response('<html>'+ 'x'.repeat(150)+'</html>')),/INVALID_UPSTREAM/);
});
test('Yahoo rejects error payloads and mixed symbol data',async()=>{
  const spec=requestSpec({source:'yahoo_chart',params:{symbol:'^VIX',range:'3mo'}});
  const body={chart:{result:[{meta:{symbol:'^GSPC'},timestamp:[1,2,3]}]},padding:'x'.repeat(150)};
  await assert.rejects(collect(spec,{},async()=>new Response(JSON.stringify(body))),/INVALID_UPSTREAM/);
});
