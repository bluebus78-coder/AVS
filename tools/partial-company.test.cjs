const {test}=require('node:test');
const assert=require('node:assert/strict');
const {requestSpec,collect}=require('../server/data-sources.cjs');

test('explicit unavailable finance preserves available integration instead of failing the complete company record',async()=>{
  const result=await collect(requestSpec({source:'naver_company_data',params:{code:'415640'}}),{},async url=>{
    const period=url.split('/').at(-1);
    return new Response(JSON.stringify(period==='integration'?
      {itemCode:'415640',stockName:'Known issuer',totalInfos:[{key:'marketValue',value:'5000'}],padding:'x'.repeat(120)}:
      {itemCode:'415640',financePeriodType:period,financeInfo:null,corporationSummary:null}));
  });
  const value=JSON.parse(Buffer.from(result.body,'base64'));
  assert.equal(value.integration.itemCode,'415640');
  assert.equal(value.annual.financeInfo,null);
  assert.equal(value.availability.annual,'not_provided');
  assert.equal(value.availability.quarter,'not_provided');
  assert.ok(!JSON.stringify(value).includes('financeInfo":0'));
});

test('small finance payload still requires exact identity, requested period and explicit null',async()=>{
  const spec=requestSpec({source:'naver_finance',params:{code:'415640',period:'annual'}});
  for(const value of [
    {itemCode:'005930',financePeriodType:'annual',financeInfo:null},
    {itemCode:'415640',financePeriodType:'quarter',financeInfo:null},
    {itemCode:'415640',financePeriodType:'annual'},
    {itemCode:'415640',financePeriodType:'annual',financeInfo:0},
  ]) await assert.rejects(collect(spec,{},async()=>new Response(JSON.stringify(value))),/INVALID_UPSTREAM/);
});
