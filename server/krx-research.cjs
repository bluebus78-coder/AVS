"use strict";
const {createHash} = require('node:crypto');
const {boundedText} = require('./financials.cjs');
const SERVICES = Object.freeze({
  daily: {KOSPI:'stk_bydd_trd', KOSDAQ:'ksq_bydd_trd'},
  basic: {KOSPI:'stk_isu_base_info', KOSDAQ:'ksq_isu_base_info'},
});
const FIELDS = Object.freeze({
  daily: ['BAS_DD','ISU_CD','ISU_NM','MKT_NM','SECT_TP_NM','TDD_CLSPRC','CMPPREVDD_PRC',
    'FLUC_RT','TDD_OPNPRC','TDD_HGPRC','TDD_LWPRC','ACC_TRDVOL','ACC_TRDVAL','MKTCAP','LIST_SHRS'],
  basic: ['ISU_CD','ISU_SRT_CD','ISU_NM','ISU_ABBRV','ISU_ENG_NM','LIST_DD','MKT_TP_NM',
    'SECUGRP_NM','SECT_TP_NM','KIND_STKCERT_TP_NM','PARVAL','LIST_SHRS'],
});
const ERRORS = Object.freeze(['KRX_KEY_UNAUTHORIZED','KRX_SERVICE_FORBIDDEN','KRX_QUOTA_EXCEEDED',
  'KRX_UPSTREAM_HTTP_ERROR','KRX_INVALID_RESPONSE','KRX_IDENTITY_MISMATCH','KRX_TIMEOUT',
  'KRX_RESPONSE_TOO_LARGE','KRX_UPSTREAM_UNAVAILABLE','KRX_LOCAL_THROTTLED']);
function validRequest(b, now = new Date()) {
  if (!b || typeof b !== 'object' || Array.isArray(b)
      || Object.keys(b).some(k=>!['action','market','date'].includes(k))
      || !Object.hasOwn(SERVICES,b.action) || !['KOSPI','KOSDAQ'].includes(b.market)
      || typeof b.date !== 'string' || !/^\d{8}$/.test(b.date)) return false;
  const d=new Date(b.date.slice(0,4)+'-'+b.date.slice(4,6)+'-'+b.date.slice(6,8)+'T00:00:00Z');
  const today=new Date(now.getTime()+9*3600000).toISOString().slice(0,10).replaceAll('-','');
  return Number.isFinite(+d) && d.toISOString().slice(0,10).replaceAll('-','')===b.date
    && b.date>='20100104' && b.date<today;
}
function normalize(payload,b,stamp) {
  if (!payload || !Array.isArray(payload.OutBlock_1) || payload.OutBlock_1.length>10000)
    throw new Error('KRX_INVALID_RESPONSE');
  const seen=new Set();
  const records=payload.OutBlock_1.map(row=>{
    const code=b.action==='daily'?row.ISU_CD:row.ISU_SRT_CD;
    if (typeof code!=='string' || !/^[A-Z0-9]{6}$/.test(code) || seen.has(code)
        || typeof row.ISU_NM!=='string' || !row.ISU_NM.trim()
        || (b.action==='daily' && (row.BAS_DD?.replaceAll('-','')!==b.date || row.MKT_NM!==b.market))
        || (b.action==='basic' && (!/^[A-Z0-9]{12}$/.test(row.ISU_CD||'')
          || row.MKT_TP_NM!==b.market))) throw new Error('KRX_IDENTITY_MISMATCH');
    seen.add(code);
    const clean={};
    for(const field of FIELDS[b.action]) {
      if (typeof row[field]!=='string' || row[field].length>200) throw new Error('KRX_INVALID_RESPONSE');
      clean[field]=row[field];
    }
    return clean;
  });
  return {schema:1,source:'KRX',attribution:'한국거래소 통계정보',action:b.action,market:b.market,
    requestedDate:b.date,collectedAt:stamp,status:records.length?'OK':'NO_DATA',records,
    priceBasis:b.action==='daily'?'UNADJUSTED_DAILY':'SECURITY_MASTER',
    adjustedPriceCertified:false,totalReturnCertified:false,publicRedistributionAllowed:false};
}
function safeError(error) {
  return new Error(ERRORS.includes(error?.message)?error.message
    : ['AbortError','TimeoutError'].includes(error?.name)?'KRX_TIMEOUT'
    : error?.message==='RESPONSE_TOO_LARGE'?'KRX_RESPONSE_TOO_LARGE':'KRX_UPSTREAM_UNAVAILABLE');
}
async function collect(b,key,fetcher=fetch) {
  if (!validRequest(b)) throw new Error('KRX_INVALID_RESPONSE');
  const service=SERVICES[b.action][b.market];
  const url=new URL('https://data-dbg.krx.co.kr/svc/apis/sto/'+service);
  url.searchParams.set('basDd',b.date);
  try {
    const response=await fetcher(url,{headers:{AUTH_KEY:key,Accept:'application/json'},
      redirect:'error',signal:AbortSignal.timeout(45000)});
    if (response.status===401) throw new Error('KRX_KEY_UNAUTHORIZED');
    if (response.status===403) throw new Error('KRX_SERVICE_FORBIDDEN');
    if (response.status===429) throw new Error('KRX_QUOTA_EXCEEDED');
    if (!response.ok) throw new Error('KRX_UPSTREAM_HTTP_ERROR');
    const text=await boundedText(response,3*1024*1024);
    let payload;
    try {payload=JSON.parse(text);} catch {throw new Error('KRX_INVALID_RESPONSE');}
    if (String(payload?.respCode)==='401') throw new Error('KRX_KEY_UNAUTHORIZED');
    if (String(payload?.respCode)==='403') throw new Error('KRX_SERVICE_FORBIDDEN');
    if (String(payload?.respCode)==='429') throw new Error('KRX_QUOTA_EXCEEDED');
    const result=normalize(payload,b,new Date().toISOString());
    return {...result,service,responseSha256:createHash('sha256').update(text).digest('hex')};
  } catch(error) {throw safeError(error);}
}
// Per-instance cache/single-flight is supplementary; the research client also enforces a total request budget.
function cachedCollector(fetcher=fetch) {
  const cache=new Map(),pending=new Map();let lastRequest=0;
  return async (b,key)=>{
    const id=createHash('sha256').update(key).digest('hex')+JSON.stringify(b);
    const old=cache.get(id);
    if(old && old.until>Date.now())return old.data;
    if(pending.has(id))return pending.get(id);
    if(Date.now()-lastRequest<1000)throw new Error('KRX_LOCAL_THROTTLED');
    lastRequest=Date.now();
    const job=collect(b,key,fetcher).then(data=>{
      if(cache.size>=8)cache.delete(cache.keys().next().value);
      cache.set(id,{data,until:Date.now()+(data.status==='OK'?3600000:60000)});return data;
    }).finally(()=>pending.delete(id));
    pending.set(id,job);return job;
  };
}
module.exports={validRequest,normalize,collect,cachedCollector,ERRORS};
