const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('status reads the actual database date and timezone without changing budget or timezone', async () => {
  const original = Module._load;
  const queries = [];
  const row = {resources: 1, available: 1, budget_timezone: 'UTC', budget_day: '2026-10-28',
    next_budget_day_at: '2026-10-29T00:00:00.000Z', database_observed_at: '2026-10-28T19:00:00.000Z'};
  let factory;
  try {
    Module._load = function(name, ...args) {
      if (name === '@neondatabase/serverless') return {neon: () => async strings => {
        const sql = strings.join('?'); queries.push(sql);
        return sql.includes('AS resources') ? [row] : [];
      }};
      return original.call(this, name, ...args);
    };
    const path = require.resolve('../server/data-store.cjs');
    delete require.cache[path];
    factory = require(path).makeStore;
  } finally {Module._load = original;}
  const result = await factory({DATABASE_URL: 'synthetic-only'}).status();
  const status = queries.find(q => q.includes('AS resources'));
  assert.match(status, /current_setting\('TimeZone'\)/);
  assert.match(status, /current_date::text AS budget_day/);
  assert.match(status, /current_date\+1/);
  assert.ok(!queries.some(q => /\b(UPDATE|INSERT|DELETE|SET\s+TIME)/i.test(q)));
  assert.equal(result.next_budget_day_at, row.next_budget_day_at);
});
