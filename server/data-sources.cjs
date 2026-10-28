"use strict";
const {collectDart} = require('./financials.cjs');
const MAX_BYTES = 1800000;
const {EXTRA,extraSpec}=require('./macro-sources.cjs');
const {requireStockCode}=require('./stock-code.cjs');
const SOURCES = Object.freeze({
  ...EXTRA,
  dart: {label: 'DART 재무', ttl: 86400},
  naver_prices: {label: '네이버 일별 가격', ttl: 900},
  naver_company: {label: '네이버 기업 재무', ttl: 900},
  naver_investors: {label: '네이버 외국인·기관 수급', ttl: 900},
  naver_universe: {label: '네이버 시장 종목', ttl: 900},
});
function requestSpec(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('INVALID_REQUEST');
  const {source, params:p} = input;
  if (Object.keys(input).some(k=> !['source','params'].includes(k)) || typeof source!=='string' || !Object.hasOwn(SOURCES,source)
      || !p || typeof p !== 'object' || Array.isArray(p)) throw Error('INVALID_REQUEST');
  if(Object.hasOwn(EXTRA,source)) return extraSpec(source,p);
  const exact = keys => {if(Object.keys(p).some(k=>!keys.includes(k))) throw Error('INVALID_REQUEST');};
  let url;
  const code = () => requireStockCode(p.code);
  if(source === 'dart') {
    exact(['corpCode','year','report','basis']);
    if(!/^\d{8}$/.test(p.corpCode || '') || !/^20\d{2}$/.test(p.year || '')
       || +p.year < 2015 || +p.year > new Date().getUTCFullYear()
       || !['11011','11012','11013','11014'].includes(p.report) || !['CFS','OFS'].includes(p.basis)) throw Error('INVALID_REQUEST');
  } else if(source === 'naver_prices') {
    exact(['code','start','end']); code();
    if(!/^20\d{6}$/.test(p.start || '') || !/^20\d{6}$/.test(p.end || '') || p.start > p.end) throw Error('INVALID_REQUEST');
    url = new URL('https://api.finance.naver.com/siseJson.naver');
    url.search = new URLSearchParams({symbol:p.code, requestType:'1', startTime:p.start, endTime:p.end, timeframe:'day'});
  } else if(source === 'naver_universe') {
    exact(['market','page']);
    if(!['0','1'].includes(p.market) || !/^\d{1,3}$/.test(p.page || '') || +p.page < 1 || +p.page > 100) throw Error('INVALID_REQUEST');
    url = new URL('https://finance.naver.com/sise/sise_market_sum.naver');
    url.search = new URLSearchParams({sosok:p.market,page:p.page});
  } else {
    exact(source === 'naver_investors' ? ['code','page'] : ['code']); code();
    if(source === 'naver_investors' && (!/^\d{1,2}$/.test(p.page || '') || +p.page<1 || +p.page>10)) throw Error('INVALID_REQUEST');
    url = new URL(`https://finance.naver.com/item/${source === 'naver_company' ? 'main' : 'frgn'}.naver`);
    url.search = new URLSearchParams(source === 'naver_company' ? {code:p.code} : {code:p.code,page:p.page});
  }
  return {source, params:Object.fromEntries(Object.entries(p).sort()), url:url?.toString(), ttl:SOURCES[source].ttl};
}
async function collect(spec, env=process.env, fetcher=fetch) {
  if(spec.source==='naver_company_data') {
    const code=spec.params.code;
    const specs=[{source:'naver_integration',params:{code}},...['annual','quarter'].map(period=>({source:'naver_finance',params:{code,period}}))];
    const responses=await Promise.all(specs.map(s=>collect(requestSpec(s),env,fetcher)));
    const [integration,annual,quarter]=responses.map(r=>JSON.parse(Buffer.from(r.body,'base64').toString('utf8')));
    const bytes=Buffer.from(JSON.stringify({itemCode:code,integration,annual,quarter}));
    return {kind:'http',status:200,contentType:'application/json; charset=utf-8',body:bytes.toString('base64'),
      body_sha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex'),origin:responses.map(r=>r.origin)};
  }
  if(spec.source === 'dart') {
    if(!/^[A-Za-z0-9]{40}$/.test(env.DART_API_KEY || '')) throw Error('DART_NOT_CONFIGURED');
    return {kind:'financial', data:await collectDart(spec.params,env.DART_API_KEY)};
  }
  const response = await fetcher(spec.url,{redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{'User-Agent':'Mozilla/5.0','Referer':'https://finance.naver.com/'}});
  if(!response.ok) throw Error('UPSTREAM_UNAVAILABLE');
  const chunks=[]; let size=0;
  for await (const chunk of response.body) {
    size+=chunk.length; if(size>MAX_BYTES) throw Error('RESPONSE_TOO_LARGE'); chunks.push(chunk);
  }
  const bytes=Buffer.concat(chunks);
  if(bytes.length<100) throw Error('EMPTY_UPSTREAM');
  const text=bytes.toString('latin1');
  if(Object.hasOwn(EXTRA,spec.source)) {
    if(spec.source==='news') {if(!/<rss[\s>]/i.test(text)) throw Error('INVALID_UPSTREAM');}
    else if(spec.source==='fred') {if(!text.startsWith('observation_date,'+spec.params.series) && !text.startsWith('DATE,'+spec.params.series)) throw Error('INVALID_UPSTREAM');}
    else {
      const data=JSON.parse(bytes.toString('utf8'));
      if(spec.source==='yahoo_chart') {
        const chart=data.chart?.result?.[0];
        if(data.chart?.error || chart?.meta?.symbol!==spec.params.symbol || !chart.timestamp?.length) throw Error('INVALID_UPSTREAM');
      } else if(spec.source==='naver_market_list') {
        if(!Array.isArray(data.stocks)||data.stockListCategoryType!==spec.params.market) throw Error('INVALID_UPSTREAM');
      } else if(spec.source==='naver_trend') {
        if(!Array.isArray(data)||data.some(r=>r.itemCode!==spec.params.code)) throw Error('INVALID_UPSTREAM');
      } else if(data.itemCode!==spec.params.code) throw Error('INVALID_UPSTREAM');
      if(spec.source==='naver_finance' && (data.financePeriodType!==spec.params.period || data.financeInfo?.itemCode!==spec.params.code || !Array.isArray(data.financeInfo?.rowList))) throw Error('INVALID_UPSTREAM');
    }
  } else if(spec.source==='naver_prices' ? !text.includes('[') : !/<html|<table/i.test(text)) throw Error('INVALID_UPSTREAM');
  return {kind:'http',status:200,contentType:response.headers.get('content-type') || 'application/octet-stream',
    body:bytes.toString('base64'),body_sha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex'),origin:spec.url};
}
module.exports={SOURCES,requestSpec,collect};
