"use strict";
const {createHash,timingSafeEqual}=require('node:crypto');
const {boundedText}=require('./financials.cjs');
const {createHub}=require('./data-hub.cjs');
const SERVICES=Object.freeze({
  stk_bydd_trd:{path:'sto',label:'코스피 일별매매',identity:['ISU_CD'],price:'TDD_CLSPRC'},
  ksq_bydd_trd:{path:'sto',label:'코스닥 일별매매',identity:['ISU_CD'],price:'TDD_CLSPRC'},
  stk_isu_base_info:{path:'sto',label:'코스피 종목기본',identity:['ISU_CD']},
  ksq_isu_base_info:{path:'sto',label:'코스닥 종목기본',identity:['ISU_CD']},
  kospi_dd_trd:{path:'idx',label:'KOSPI 지수',identity:['IDX_NM'],price:'CLSPRC_IDX'},
  kosdaq_dd_trd:{path:'idx',label:'KOSDAQ 지수',identity:['IDX_NM'],price:'CLSPRC_IDX'},
  krx_dd_trd:{path:'idx',label:'KRX 지수',identity:['IDX_NM'],price:'CLSPRC_IDX'},
  etf_bydd_trd:{path:'etp',label:'ETF 일별매매',identity:['ISU_CD'],price:'TDD_CLSPRC'},
  bon_dd_trd:{path:'idx',label:'채권지수',identity:['BND_IDX_GRP_NM'],price:'TOT_EARNG_IDX'},
  fut_bydd_trd:{path:'drv',label:'선물 일별매매',identity:['MKT_NM','ISU_CD'],price:'TDD_CLSPRC'},
  gold_bydd_trd:{path:'gen',label:'금시장 일별매매',identity:['ISU_CD'],price:'TDD_CLSPRC'},
});
function kstDate(now=new Date()) {return new Date(+now+9*3600000).toISOString().slice(0,10).replaceAll('-','');}
function candidateDates(now=new Date()) {
  const date=new Date(kstDate(now).replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3')+'T00:00:00Z'),result=[];
  for(let i=0;i<14&&result.length<7;i++) {
    date.setUTCDate(date.getUTCDate()-1);
    if(![0,6].includes(date.getUTCDay()))result.push(date.toISOString().slice(0,10).replaceAll('-',''));
  }
  return result;
}
function requestSpec(input,now=new Date()) {
  const p=input?.params;
  if(!input||input.source!=='krx'||Object.keys(input).some(k=>!['source','params'].includes(k))
      ||!p||Array.isArray(p)||Object.keys(p).some(k=>!['service','date'].includes(k))
      ||!Object.hasOwn(SERVICES,p.service)||typeof p.date!=='string'||!/^\d{8}$/.test(p.date))throw Error('INVALID_REQUEST');
  const date=new Date(p.date.replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3')+'T00:00:00Z');
  if(!Number.isFinite(+date)||date.toISOString().slice(0,10).replaceAll('-','')!==p.date||p.date<'20100104'||p.date>=kstDate(now))throw Error('INVALID_REQUEST');
  return {source:'krx',params:{date:p.date,service:p.service},ttl:86400};
}
function normalize(payload,spec) {
  const {service,date}=spec.params,info=SERVICES[service],rows=payload?.OutBlock_1;
  if(!Array.isArray(rows)||rows.length>10000)throw Error('KRX_INVALID_RESPONSE');
  if(!rows.length)throw Error('KRX_NO_DATA');
  const seen=new Set();
  for(const row of rows) {
    if(!row||Object.values(row).some(v=>typeof v!=='string'||v.length>500))throw Error('KRX_INVALID_RESPONSE');
    const id=info.identity.map(k=>row[k]);
    if(id.some(v=>!v)||seen.has(JSON.stringify(id)))throw Error('KRX_IDENTITY_MISMATCH');
    seen.add(JSON.stringify(id));
    if(row.BAS_DD!==undefined&&row.BAS_DD.replaceAll('-','')!==date)throw Error('KRX_IDENTITY_MISMATCH');
    if(service.endsWith('isu_base_info')) {
      if(!/^[A-Z0-9]{12}$/.test(row.ISU_CD)||!/^[A-Z0-9]{6}$/.test(row.ISU_SRT_CD))throw Error('KRX_IDENTITY_MISMATCH');
    }
    if(service.startsWith('stk_')&&row.MKT_NM!==undefined&&row.MKT_NM!=='KOSPI')throw Error('KRX_IDENTITY_MISMATCH');
    if(service.startsWith('ksq_')&&row.MKT_NM!==undefined&&row.MKT_NM!=='KOSDAQ')throw Error('KRX_IDENTITY_MISMATCH');
  }
  const priced=info.price?rows.filter(row=>row[info.price]?.trim()&&Number.isFinite(Number(row[info.price].replaceAll(',','')))&&Number(row[info.price].replaceAll(',',''))>0).length:null;
  if(info.price&&!priced)throw Error('KRX_NO_DATA');
  // Preserve all original fields and blank values; missing index prices are not zero.
  return {schema:1,source:'KRX',service,date,status:'OK',attribution:'한국거래소 통계정보',
    price_basis:info.price?'UNADJUSTED_DAILY':'SECURITY_MASTER',is_realtime:false,
    adjusted_price_certified:false,owner_use_only:true,record_count:rows.length,
    priced_record_count:priced,records:rows};
}
async function collect(spec,env=process.env,fetcher=fetch) {
  if(!/^[A-Za-z0-9]{40}$/.test(env.KRX_API_KEY||''))throw Error('KRX_NOT_CONFIGURED');
  const {service,date}=spec.params;
  const url=`https://data-dbg.krx.co.kr/svc/apis/${SERVICES[service].path}/${service}?basDd=${date}`;
  const response=await fetcher(url,{headers:{AUTH_KEY:env.KRX_API_KEY,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error(response.status===401?'KRX_ACCESS_DENIED':'KRX_UPSTREAM_UNAVAILABLE');
  let payload;try{payload=JSON.parse(await boundedText(response,2200000));}catch{throw Error('KRX_INVALID_RESPONSE');}
  if(payload?.respCode&&String(payload.respCode)!=='200')throw Error('KRX_ACCESS_DENIED');
  let data;
  try{data=normalize(payload,spec);}catch(error){
    if(error.message!=='KRX_NO_DATA')throw error;
    data={schema:1,source:'KRX',service,date,status:'NO_DATA',is_realtime:false,owner_use_only:true,
      attribution:'한국거래소 통계정보',record_count:0,records:[]};
  }
  return {kind:'krx',data,cache_ttl:data.status==='NO_DATA'?120:86400,
    data_sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex')};
}
function authorized(header,secret) {
  if(typeof secret!=='string'||secret.length<32||typeof header!=='string')return false;
  const a=Buffer.from(header),b=Buffer.from('Bearer '+secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
function createKrxHub(store,env=process.env,fetcher=fetch) {
  return createHub(store,spec=>collect(spec,env,fetcher),()=>Date.now(),requestSpec);
}
async function readSnapshot(hub,service,date,now=new Date()) {
  if(!Object.hasOwn(SERVICES,service))throw Error('INVALID_REQUEST');
  const dates=date===undefined?candidateDates(now):[date];
  for(const candidate of dates) {
    try {
      if(date===undefined&&service!=='stk_bydd_trd') {
        const market=await hub.read({source:'krx',params:{service:'stk_bydd_trd',date:candidate}});
        if(market.payload?.data?.status==='NO_DATA')continue;
        if(!['fresh_cache','refreshed'].includes(market.status))return {schema:1,status:'pending'};
      }
      const result=await hub.read({source:'krx',params:{service,date:candidate}});
      if(result.payload?.data?.status==='NO_DATA') {
        if(date!==undefined)throw Error('KRX_NO_DATA');
        continue;
      }
      return result;
    }catch(error){if(error.message!=='KRX_NO_DATA'||date!==undefined)throw error;}
  }
  throw Error('KRX_NO_DATA');
}
function dailyInputs(now=new Date()) {
  const date=candidateDates(now)[0];
  return Object.keys(SERVICES).map(service=>({source:'krx',params:{service,date}}));
}
module.exports={SERVICES,kstDate,candidateDates,requestSpec,normalize,collect,authorized,createKrxHub,readSnapshot,dailyInputs};
