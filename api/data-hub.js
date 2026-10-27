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
      return res.status(invalid?400:disabled?409:503).json({error:invalid?'INVALID_REQUEST':disabled?'SOURCE_NOT_ENABLED':'DATA_UNAVAILABLE'});
    }
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
