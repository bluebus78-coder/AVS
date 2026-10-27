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
      const [r]=await sql`SELECT payload,checksum,collected_at,expires_at,retry_after FROM avs_public_data WHERE key=${key}`;
      if(!r) return null;
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
      return sql`SELECT request FROM avs_public_data WHERE expires_at<now() AND (retry_after IS NULL OR retry_after<now())
        AND accessed_at>now()-interval '7 days' ORDER BY expires_at LIMIT ${limit}`;
    },
    async status() {
      await init(); const [r]=await sql`SELECT count(*)::int AS resources,count(payload)::int AS available,
        count(*) FILTER(WHERE expires_at<now())::int AS expired,max(collected_at) AS last_collected_at FROM avs_public_data`;
      return r;
    },
    async prune() {
      await sql`DELETE FROM avs_public_data WHERE accessed_at<now()-interval '14 days' AND (lease_until IS NULL OR lease_until<now())`;
      await sql`DELETE FROM avs_data_budget WHERE day<current_date-14`;
    },
  };
}
module.exports={makeStore};
