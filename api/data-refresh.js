const {timingSafeEqual}=require('node:crypto');
const {makeStore}=require('../server/data-store.cjs');
const {createHub}=require('../server/data-hub.cjs');
const {SYMBOLS,SERIES,NEWS}=require('../server/macro-sources.cjs');
const krx=require('../server/krx-data.cjs');
function dailyInputs() {
  return [...SYMBOLS.map(symbol=>({source:'yahoo_chart',params:{symbol,range:'3mo'}})),
    ...SERIES.map(series=>({source:'fred',params:{series}})),
    ...NEWS.map(query=>({source:'news',params:{query}})),
    ...['KOSPI','KOSDAQ'].flatMap(code=>['basic','integration'].map(part=>({source:'naver_index',params:{code,part}})))];
}
function authorized(header,secret) {
  if(!secret || secret.length<32 || typeof header!=='string') return false;
  const a=Buffer.from(header),b=Buffer.from('Bearer '+secret);
  return a.length===b.length && timingSafeEqual(a,b);
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  if(!authorized(req.headers.authorization,process.env.CRON_SECRET)) return res.status(401).json({error:'UNAUTHORIZED'});
  try {
    const store=makeStore(),hub=createHub(store),due=await store.due(120),start=Date.now();let refreshed=0,failed=0,cached=0,next=0;
    const krxHub=krx.createKrxHub(store);
    const queue=[...new Map([...dailyInputs(),...(process.env.KRX_API_KEY?krx.dailyInputs():[]),...due.map(r=>r.request)].map(r=>[JSON.stringify(r),r])).values()];
    await Promise.all(Array.from({length:4},async()=>{
      while(next<queue.length && Date.now()-start<180000) {
        const request=queue[next++];
        try {const r=await (request.source==='krx'?krxHub:hub).read(request); if(r.status==='refreshed') refreshed++; else if(r.status==='fresh_cache') cached++; else failed++;} catch {failed++;}
      }
    }));
    await store.prune();
    res.status(200).json({schema:1,selected:queue.length,attempted:next,refreshed,cached,failed,remaining_refresh:'on_demand',status:await store.status()});
  } catch {res.status(503).json({error:'REFRESH_UNAVAILABLE'});}
};
