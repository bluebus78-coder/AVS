"use strict";
const {createHash}=require('node:crypto');
const {requestSpec,collect}=require('./data-sources.cjs');
function digest(value) {return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function createHub(store,collector=collect,clock=()=>Date.now(),specFactory=requestSpec) {
  const envelope=(key,row,state)=>({schema:1,key,snapshot_id:row.checksum,collected_at:row.collected_at,
    expires_at:row.expires_at,status:state,payload:row.payload,checksum:digest(row.payload)});
  return {
    async read(input) {
      const spec=specFactory(input), request={source:spec.source,params:spec.params}, key=digest(request);
      const row=await store.read(key);
      if(row?.payload && Math.min(new Date(row.expires_at).getTime(),
          new Date(row.collected_at).getTime()+spec.ttl*1000)>clock()) return envelope(key,row,'fresh_cache');
      const exhausted=()=>{
        if(row?.payload) return envelope(key,row,'stale_budget_exhausted');
        throw Error('COLLECTION_BUDGET_EXHAUSTED');
      };
      // Check capacity without charging or inserting an empty row. Charge only
      // the lease owner that will actually attempt an upstream collection.
      if(store.budgetAvailable && !await store.budgetAvailable()) return exhausted();
      const owner=await store.claim(key,request);
      if(!owner) return row?.payload ? envelope(key,row,'stale_refresh_pending') : {schema:1,key,status:'pending'};
      if(!await store.budget()) {
        if(store.release) await store.release(key,owner);
        else await store.fail(key,owner);
        return exhausted();
      }
      try {
        const payload=await collector(spec), checksum=digest(payload);
        await store.save(key,owner,payload,checksum,Math.min(spec.ttl,payload.cache_ttl||spec.ttl));
        return envelope(key,await store.read(key),'refreshed');
      } catch(e) {
        await store.fail(key,owner);
        if(row?.payload) return envelope(key,row,'stale_upstream_unavailable');
        throw e;
      }
    },
  };
}
module.exports={createHub,digest};
