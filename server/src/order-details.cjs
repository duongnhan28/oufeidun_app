const { assert } = require('./core.cjs');
// Explicit Vietnam wall time; reject rollover dates and implicit host time zones.
function orderDate(value) {
  const text = String(value || '');
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\+07:00)?$/.test(text), 'INVALID_ORDER_DATE');
  const wall = text.replace(/\+07:00$/, '');
  const full = wall.length === 16 ? wall + ':00' : wall;
  const date = new Date(full + '+07:00');
  assert(Number.isFinite(date.getTime()) && full.slice(0,4) >= '2000' && full.slice(0,4) <= '2100', 'INVALID_ORDER_DATE');
  assert(new Date(date.getTime() + 7*3600000).toISOString().slice(0,19) === full, 'INVALID_ORDER_DATE');
  return full.replace('T',' ');
}
module.exports = { orderDate };
