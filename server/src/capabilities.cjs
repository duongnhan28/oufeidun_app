// NULL is the pre-upgrade policy. New staff are explicitly saved with {}.
const keys=['receive_stock','adjust_stock','manage_products','manage_prices','manage_returns','view_reports','view_audit'];
const legacy=Object.fromEntries(keys.map(k=>[k,k!=='receive_stock']));
function permissions(actor){
 if(actor.role==='admin')return Object.fromEntries(keys.map(k=>[k,true]));
 const raw=typeof actor.permissions==='string'?JSON.parse(actor.permissions):actor.permissions;
 return Object.fromEntries(keys.map(k=>[k,raw==null?legacy[k]:raw[k]===true]));
}
function allowed(actor,key){return Boolean(actor&&permissions(actor)[key]);}
module.exports={keys,permissions,allowed};
