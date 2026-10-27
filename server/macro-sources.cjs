"use strict";
const SYMBOLS=['KRW=X','^KS11','^KQ11','^IXIC','^GSPC','^DJI','^SOX','^VIX','^TNX','CL=F','GC=F','DX-Y.NYB'];
const SERIES=['VIXCLS','DGS10','DGS2','FEDFUNDS','DEXKOUS'];
const NEWS=['코스피 증시','NASDAQ stock market','AI semiconductor stock'];
const EXTRA=Object.freeze(Object.fromEntries([
  ['naver_integration',900],['naver_company_data',900],['naver_finance',21600],['naver_market_list',900],
  ['naver_trend',900],['naver_index',60],['yahoo_chart',300],['fred',3600],['news',900],
].map(([name,ttl])=>[name,{label:name,ttl}])));
function extraSpec(source,p) {
  const exact=keys=>{if(Object.keys(p).some(k=>!keys.includes(k))) throw Error('INVALID_REQUEST');};
  const code=()=>{if(!/^\d{6}$/.test(p.code||'')) throw Error('INVALID_REQUEST');};
  let url;
  if(['naver_integration','naver_company_data','naver_finance','naver_trend'].includes(source)) {
    exact(source==='naver_finance'?['code','period']:source==='naver_trend'?['code','page']:['code']);code();
    let suffix='integration';
    if(source==='naver_finance') {
      if(!['annual','quarter'].includes(p.period)) throw Error('INVALID_REQUEST');
      suffix='finance/'+p.period;
    }
    if(source==='naver_trend') {
      if(!/^[1-9]\d?$/.test(p.page||'') || +p.page>10) throw Error('INVALID_REQUEST');
      suffix='trend?page='+p.page+'&pageSize=20';
    }
    url=`https://m.stock.naver.com/api/stock/${p.code}/${suffix}`;
  } else if(source==='naver_market_list') {
    exact(['market','page']);
    if(!['KOSPI','KOSDAQ'].includes(p.market)|| !/^\d{1,3}$/.test(p.page||'') || +p.page<1 || +p.page>100) throw Error('INVALID_REQUEST');
    url=`https://m.stock.naver.com/api/stocks/marketValue/${p.market}?page=${p.page}&pageSize=50`;
  } else if(source==='naver_index') {
    exact(['code','part']);
    if(!['KOSPI','KOSDAQ'].includes(p.code)||!['basic','integration'].includes(p.part)) throw Error('INVALID_REQUEST');
    url=`https://m.stock.naver.com/api/index/${p.code}/${p.part}`;
  } else if(source==='yahoo_chart') {
    exact(['symbol','range']);
    if(!SYMBOLS.includes(p.symbol)||!['3mo','1mo','5d'].includes(p.range)) throw Error('INVALID_REQUEST');
    url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(p.symbol)}?range=${p.range}&interval=1d&events=div%2Csplits`;
  } else if(source==='fred') {
    exact(['series']);if(!SERIES.includes(p.series)) throw Error('INVALID_REQUEST');
    // Public CSV endpoint: no personal FRED key is sent to the shared service.
    url='https://fred.stlouisfed.org/graph/fredgraph.csv?'+new URLSearchParams({id:p.series,cosd:'2025-01-01'});
  } else if(source==='news') {
    exact(['query']);if(!NEWS.includes(p.query)) throw Error('INVALID_REQUEST');
    url='https://news.google.com/rss/search?'+new URLSearchParams({q:p.query,hl:'ko',gl:'KR',ceid:'KR:ko'});
  } else throw Error('INVALID_REQUEST');
  return {source,params:Object.fromEntries(Object.entries(p).sort()),url,ttl:EXTRA[source].ttl};
}
module.exports={EXTRA,SYMBOLS,SERIES,NEWS,extraSpec};
