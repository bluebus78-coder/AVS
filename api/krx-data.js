const {makeStore}=require('../server/data-store.cjs');
const {SERVICES,authorized,createKrxHub,readSnapshot}=require('../server/krx-data.cjs');
function createHandler(env=process.env,storeFactory=makeStore) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(!authorized(req.headers?.authorization,env.KRX_DATA_TOKEN))return res.status(401).json({error:'UNAUTHORIZED'});
    if(req.method==='GET')return res.status(200).json({schema:1,source:'KRX',owner_use_only:true,
      is_realtime:false,services:SERVICES,schedule:'daily_and_on_demand'});
    if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
    const b=req.body;
    if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['service','date'].includes(k))
       ||!Object.hasOwn(SERVICES,b.service)||(b.date!==undefined&&typeof b.date!=='string'))return res.status(400).json({error:'INVALID_REQUEST'});
    try {
      const result=await readSnapshot(createKrxHub(storeFactory(env),env),b.service,b.date);
      return res.status(result.status==='pending'?202:200).json(result);
    }catch(error){
      const allowed=['INVALID_REQUEST','KRX_NO_DATA','KRX_NOT_CONFIGURED','KRX_ACCESS_DENIED','KRX_INVALID_RESPONSE',
        'KRX_IDENTITY_MISMATCH','COLLECTION_BUDGET_EXHAUSTED','KRX_UPSTREAM_UNAVAILABLE'];
      const code=allowed.includes(error.message)?error.message:'KRX_UPSTREAM_UNAVAILABLE';
      return res.status(code==='INVALID_REQUEST'?400:code==='KRX_NO_DATA'?404:503).json({error:code});
    }
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
