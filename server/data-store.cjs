"use strict";
const {neon} = require('@neondatabase/serverless');
const {gzipSync,gunzipSync} = require('node:zlib');
const {randomUUID} = require('node:crypto');
let ready;
function makeStore(env=process.env) {
  if(!env.DATABASE_URL) throw Error('STORE_NOT_CONFIGURED');
  const sql=neon(env.DATABASE_URL);
  async function init() {
    if(!ready) ready=(async()=>{
      await sql`CREATE TABLE IF NOT EXISTS avs_public_data (
        key text PRIMARY KEY, request jsonb NOT NULL, payload text,
        checksum text, collected_at timestamptz, expires_at timestamptz,
        lease_until timestamptz, owner text, accessed_at timestamptz NOT NULL DEFAULT now(),
        retry_after timestamptz, failures integer NOT NULL DEFAULT 0)`;
      await sql`CREATE TABLE IF NOT EXISTS avs_data_budget (day date PRIMARY KEY, calls integer NOT NULL)`;
    })().catch(e=>{ready=undefined;throw e;});
    return ready;
  }
  return {
    async read(key) {
      await init();
      const [r]=await sql`SELECT payload,checksum,collected_at,expires_at,retry_after,accessed_at FROM avs_public_data WHERE key=${key}`;
      if(!r) return null;
      if(r.accessed_at && Date.now()-new Date(r.accessed_at).getTime()>3600000)
        await sql`UPDATE avs_public_data SET accessed_at=now() WHERE key=${key} AND accessed_at<now()-interval '1 hour'`;
      return {...r,payload:r.payload ? JSON.parse(gunzipSync(Buffer.from(r.payload,'base64'),{maxOutputLength:3000000})) : null};
    },
    async claim(key,request) {
      await init();const owner=randomUUID();
      const rows=await sql`INSERT INTO avs_public_data(key,request,owner,lease_until) VALUES(${key},${JSON.stringify(request)}::jsonb,${owner},now()+interval '45 seconds')
        ON CONFLICT(key) DO UPDATE SET owner=EXCLUDED.owner,lease_until=EXCLUDED.lease_until,accessed_at=now()
        WHERE (avs_public_data.lease_until IS NULL OR avs_public_data.lease_until<now())
        AND (avs_public_data.retry_after IS NULL OR avs_public_data.retry_after<now()) RETURNING owner`;
      return rows.length ? owner : null;
    },
    async budget() {
      const limit=Math.min(12000,Math.max(1,Number(env.AVS_DATA_DAILY_REQUEST_LIMIT)||2000));
      const rows=await sql`INSERT INTO avs_data_budget(day,calls) VALUES(current_date,1)
        ON CONFLICT(day) DO UPDATE SET calls=avs_data_budget.calls+1 WHERE avs_data_budget.calls<${limit} RETURNING calls`;
      return rows.length>0;
    },
    async budgetAvailable() {
      await init();
      const limit=Math.min(12000,Math.max(1,Number(env.AVS_DATA_DAILY_REQUEST_LIMIT)||2000));
      const [row]=await sql`SELECT COALESCE((SELECT calls FROM avs_data_budget WHERE day=current_date),0)<${limit} AS available`;
      return row.available === true;
    },
    async release(key,owner) {
      await sql`UPDATE avs_public_data SET lease_until=NULL,owner=NULL WHERE key=${key} AND owner=${owner}`;
    },
    async save(key,owner,payload,checksum,ttl) {
      const packed=gzipSync(Buffer.from(JSON.stringify(payload))).toString('base64');
      const rows=await sql`UPDATE avs_public_data SET payload=${packed},checksum=${checksum},collected_at=now(),
        expires_at=now()+${ttl}*interval '1 second',lease_until=NULL,owner=NULL,failures=0,retry_after=NULL
        WHERE key=${key} AND owner=${owner} RETURNING key`;
      if(!rows.length) throw Error('LEASE_LOST');
    },
    async fail(key,owner) {
      await sql`UPDATE avs_public_data SET lease_until=NULL,owner=NULL,failures=LEAST(failures+1,8),
        retry_after=now()+LEAST(3600,60*power(2,LEAST(failures,6))) * interval '1 second' WHERE key=${key} AND owner=${owner}`;
    },
    async due(limit=20) {
      await init();
      return sql`SELECT request FROM avs_public_data WHERE (payload IS NULL OR expires_at<now()) AND (retry_after IS NULL OR retry_after<now())
        AND accessed_at>now()-interval '7 days'
        ORDER BY CASE WHEN request->>'source' IN ('naver_market_list','naver_index','yahoo_chart','fred','news') THEN 0
          WHEN request->>'source' IN ('naver_integration','naver_company_data','naver_trend') THEN 1 ELSE 2 END,
          accessed_at DESC,expires_at NULLS FIRST,key LIMIT ${limit}`;
    },
    async status() {
      await init(); const [r]=await sql`SELECT count(*)::int AS resources,count(payload)::int AS available,
        count(*) FILTER(WHERE expires_at<now())::int AS expired,max(collected_at) AS last_collected_at,
        current_setting('TimeZone') AS budget_timezone,current_date::text AS budget_day,
        ((current_date+1)::timestamp AT TIME ZONE current_setting('TimeZone')) AS next_budget_day_at,
        now() AS database_observed_at FROM avs_public_data`;
      const groups=await sql`SELECT request->>'source' AS source,count(*)::int AS resources,
        count(payload)::int AS available,count(*) FILTER(WHERE expires_at<now())::int AS expired,
        count(*) FILTER(WHERE payload IS NULL)::int AS missing,
        count(*) FILTER(WHERE accessed_at>now()-interval '7 days')::int AS recently_used
        FROM avs_public_data GROUP BY request->>'source' ORDER BY source`;
      return {...r,cache_by_source:groups};
    },
    async prune() {
      await sql`DELETE FROM avs_public_data WHERE accessed_at<now()-interval '14 days' AND (lease_until IS NULL OR lease_until<now())`;
      await sql`DELETE FROM avs_data_budget WHERE day<current_date-14`;
    },
  };
}
module.exports={makeStore};
