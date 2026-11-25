const {timingSafeEqual}=require('node:crypto');
const {validRequest,cachedCollector,ERRORS}=require('../server/krx-research.cjs');
function authorized(header,secret) {
  if(typeof secret!=='string'||secret.length<32||typeof header!=='string')return false;
  const a=Buffer.from(header),b=Buffer.from('Bearer '+secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
function createHandler(env=process.env,collector=cachedCollector()) {
  return async (req,res)=>{
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
    if(!authorized(req.headers?.authorization,env.FINANCIAL_RESEARCH_TOKEN))
      return res.status(401).json({error:'UNAUTHORIZED'});
    if(!validRequest(req.body))return res.status(400).json({error:'INVALID_REQUEST'});
    if(typeof env.KRX_API_KEY!=='string'||!/^[A-Za-z0-9_-]{20,200}$/.test(env.KRX_API_KEY))
      return res.status(503).json({error:'KRX_SERVER_NOT_CONFIGURED'});
    try {return res.status(200).json(await collector(req.body,env.KRX_API_KEY));}
    catch(error) {
      const code=ERRORS.includes(error?.message)?error.message:'KRX_UPSTREAM_UNAVAILABLE';
      if(['KRX_LOCAL_THROTTLED','KRX_QUOTA_EXCEEDED'].includes(code)) {
        res.setHeader('Retry-After','60');return res.status(429).json({error:code});
      }
      return res.status(502).json({error:code});
    }
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
