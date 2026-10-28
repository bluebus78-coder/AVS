'use strict';

// Keep the existing Android StockCode contract, not an arbitrary URL/symbol input.
function requireStockCode(value) {
  if (typeof value !== 'string' || !/^(?:[0-9][0-9A-Z]{5}|[0-9]{7})$/.test(value)) {
    throw Error('INVALID_REQUEST');
  }
}
module.exports = {requireStockCode};
