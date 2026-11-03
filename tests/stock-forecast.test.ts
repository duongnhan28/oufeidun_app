import test from 'node:test';import assert from 'node:assert/strict';
import {estimateForCart,forecastSheets,forecastDates} from '../src/lib/stock-forecast';
test('forecast excludes current saved draft once, counts sale/gift/sample and preserves negative shortages',()=>{
 const p:any={id:'a',on_hand:100,draft_quantity:80};const saved:any={status:'draft',items:[{product_id:'a',quantity:10}]};
 const cart:any=[{product_id:'a',quantity:20},{product_id:'a',quantity:5,item_kind:'gift'},{product_id:'a',quantity:5,item_kind:'sample'},{product_id:'b',quantity:99}];
 assert.deepEqual(estimateForCart(p,cart),{otherDrafts:80,requested:30,remaining:-10});
 assert.deepEqual(estimateForCart(p,cart,saved),{otherDrafts:70,requested:30,remaining:0});
 assert.equal(estimateForCart(p,cart,{...saved,status:'confirmed'}).remaining,-10);
 assert.equal(estimateForCart({...p,draft_quantity:0},cart,saved).remaining,70);
 assert.equal(cart[0].quantity,20);assert.equal(p.on_hand,100);
});
test('forecast dates are Vietnam-inclusive, bounded and real calendar dates',()=>{
 assert.deepEqual(forecastDates('2026-11-03','2026-11-03'),['2026-11-02T17:00:00.000Z','2026-11-03T17:00:00.000Z']);
 for(const dates of [['2026-02-30','2026-03-01'],['2026-11-04','2026-11-03'],['2026-01-01','2027-01-02'],['','2026-11-03']])assert.throws(()=>forecastDates(dates[0],dates[1]));
});
test('forecast workbook keeps delivered quantity separate and never exposes costs',()=>{
 const sheets=forecastSheets({from:'2026-11-03',to:'2026-11-03',rows:[{product_id:'a',sku:'A',glass_type:'clear',on_hand:100,draft_quantity:110,estimated_quantity:-10,delivered_quantity:20},{product_id:'b',sku:'B',glass_type:'other',on_hand:3,draft_quantity:1,estimated_quantity:2,delivered_quantity:5}]});
 assert.deepEqual(sheets[0].rows[0],['A','tấm',100,110,-10,20]);assert.equal(sheets[0].rows[1][1],'sản phẩm');assert.doesNotMatch(JSON.stringify(sheets),/fixed_cost|unit_cost|profit/);
});
