const {test} = require('node:test');
const assert = require('node:assert/strict');
const {requestSpec} = require('../server/data-sources.cjs');

test('existing stock data routes accept domestic letter-containing codes', () => {
  for (const code of ['0126Z0', '00680K', '005930', '1234567']) {
    for (const source of ['naver_integration', 'naver_company_data', 'naver_finance', 'naver_trend',
      'naver_prices', 'naver_company', 'naver_investors']) {
      const params = {code, ...(source === 'naver_finance' ? {period: 'annual'} : {}),
        ...(source === 'naver_trend' || source === 'naver_investors' ? {page: '1'} : {}),
        ...(source === 'naver_prices' ? {start: '20261001', end: '20261028'} : {})};
      assert.equal(requestSpec({source, params}).params.code, code);
    }
  }
});

test('stock routes still reject path injection, foreign symbols and malformed codes', () => {
  for (const code of ['../abc', '005930/../../', '005930?x', '005930%2f', 'A12345',
    '0126z0', '00593', '12345678', 'KRW=X', '', null]) {
    assert.throws(() => requestSpec({source: 'naver_integration', params: {code}}), /INVALID_REQUEST/);
    assert.throws(() => requestSpec({source: 'naver_company', params: {code}}), /INVALID_REQUEST/);
  }
});
