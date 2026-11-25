const {makeStore}=require('../server/data-store.cjs');
const {createHub}=require('../server/data-hub.cjs');
const {SOURCES,requestSpec}=require('../server/data-sources.cjs');
function createHandler(storeFactory=makeStore) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      const store=storeFactory();
      if(req.method==='GET') return res.status(200).json({schema:1,...await store.status(),sources:SOURCES,
        market_sources_enabled:true,schedule:'daily_and_on_demand'});
      if(req.method!=='POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
      if(Buffer.byteLength(JSON.stringify(req.body || {}))>2048) return res.status(400).json({error:'INVALID_REQUEST'});
      const spec=requestSpec(req.body);
      const result=await createHub(store).read(req.body);
      if(result.status==='pending') return res.status(202).json(result);
      res.setHeader('ETag','"'+result.snapshot_id+'"');
      // Status accompanies every response, including stale data. Never hide staleness in a 304.
      return res.status(200).json(result);
    } catch(e) {
      const invalid=e.message==='INVALID_REQUEST', disabled=e.message==='SOURCE_NOT_ENABLED';
      if(invalid || disabled) return res.status(invalid?400:409).json({error:e.message});
      const known = ['COLLECTION_BUDGET_EXHAUSTED','STORE_NOT_CONFIGURED','LEASE_LOST',
        'UPSTREAM_UNAVAILABLE','EMPTY_UPSTREAM','INVALID_UPSTREAM','RESPONSE_TOO_LARGE',
        'DART_NOT_CONFIGURED','DART_TIMEOUT','DART_HTTP_ERROR','DART_INVALID_RESPONSE',
        'DART_AUTH_ERROR','DART_QUOTA_EXCEEDED','DART_MAINTENANCE','DART_FILE_UNAVAILABLE'];
      const reason=known.includes(e.message)?e.message:'DATA_UNAVAILABLE';
      const upstream=reason.startsWith('UPSTREAM_') || ['EMPTY_UPSTREAM','INVALID_UPSTREAM','RESPONSE_TOO_LARGE'].includes(reason)
        || reason.startsWith('DART_') && reason!=='DART_NOT_CONFIGURED';
      // Never log arbitrary exceptions, URLs, request bodies or credentials.
      console.warn(JSON.stringify({event:'public_data_failure',reason,
        source:typeof req.body?.source==='string' && Object.hasOwn(SOURCES,req.body.source)?req.body.source:'unknown',
        sqlstate:['42P01','42703','23505','42501','53300'].includes(e.code)?e.code:undefined}));
      if(reason==='COLLECTION_BUDGET_EXHAUSTED') res.setHeader('Retry-After','300');
      return res.status(reason==='COLLECTION_BUDGET_EXHAUSTED'?429:upstream?502:503)
        .json({error:'DATA_UNAVAILABLE',reason});
    }
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
