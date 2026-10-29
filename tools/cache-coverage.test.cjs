const {test}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

async function fixture(rows) {
  const original=Module._load,queries=[];
  try {
    Module._load=function(name,...args) {
      if(name==='@neondatabase/serverless') return {neon:()=>async(strings,...values)=>{
        const sql=strings.join('?');queries.push({sql,values});
        return rows(sql);
      }};
      return original.call(this,name,...args);
    };
    const path=require.resolve('../server/data-store.cjs');delete require.cache[path];
    return {store:require(path).makeStore({DATABASE_URL:'synthetic-only'}),queries};
  } finally {Module._load=original;}
}

test('refresh queue includes failed first collections and prioritizes live inputs before research history',async()=>{
  const {store,queries}=await fixture(()=>[]);
  await store.due(40);
  const q=queries.find(q=>q.sql.includes('SELECT request'));
  assert.match(q.sql,/payload IS NULL OR expires_at<now\(\)/);
  assert.match(q.sql,/retry_after IS NULL OR retry_after<now\(\)/);
  assert.match(q.sql,/naver_market_list.*naver_index.*yahoo_chart/s);
  assert.match(q.sql,/accessed_at DESC/);
  assert.equal(q.values.at(-1),40);
});

test('fresh cache access renews activity only when older than one hour without changing collection freshness',async()=>{
  const {store,queries}=await fixture(sql=>sql.includes('SELECT payload')?
    [{payload:null,accessed_at:new Date(Date.now()-7200000).toISOString()}]:[]);
  await store.read('synthetic-key');
  const writes=queries.filter(q=>q.sql.startsWith('UPDATE'));
  assert.equal(writes.length,1);
  assert.match(writes[0].sql,/SET accessed_at=now\(\)/);
  assert.doesNotMatch(writes[0].sql,/SET (collected_at|expires_at|payload)/);
});

test('status distinguishes query keys by source without exposing identifiers or payloads',async()=>{
  const {store,queries}=await fixture(sql=>sql.includes('GROUP BY')?
    [{source:'naver_prices',resources:8,expired:7,missing:1}]:sql.includes('AS resources')?[{resources:8}]:[]);
  const result=await store.status();
  assert.equal(result.cache_by_source[0].expired,7);
  const q=queries.find(q=>q.sql.includes('GROUP BY')).sql;
  assert.doesNotMatch(q,/SELECT (key|request,|payload,)/);
});
