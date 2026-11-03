const { assert } = require('./core.cjs');
const {allowed,permissions,keys}=require('./capabilities.cjs');
function requirePermission(actor,key){requireOperator(actor);assert(allowed(actor,key),'FORBIDDEN',403);}

function requireOperator(actor) {
  assert(actor && ['admin','staff'].includes(actor.role), 'FORBIDDEN', 403);
}
const costFields = new Set(['fixed_cost','unit_cost','unit_cost_snapshot','fixed_cost_snapshot',
  'unit_purchase_price','purchase_price','cost','total_cost','profit','stock_value','damage']);
function visibleData(actor, value) {
  if (actor.role === 'admin' || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(row => visibleData(actor,row));
  return Object.fromEntries(Object.entries(value).filter(([key])=>!costFields.has(key))
    .map(([key,field])=>[key,visibleData(actor,field)]));
}
function rejectCostWrite(actor, payload) {
  if (actor.role !== 'admin')
    assert(!Object.keys(payload).some(key=>costFields.has(key)), 'COST_ACCESS_DENIED', 403);
}
module.exports = {requireOperator,visibleData,rejectCostWrite,requirePermission,allowed,permissions,keys};
