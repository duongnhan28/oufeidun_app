import test from 'node:test';
import assert from 'node:assert/strict';
import {reportSheets} from '../src/lib/report-sheets';

test('report Excel keeps manual code 899 and SKU colors without exposing costs to staff',()=>{
 const report:any={revenue:'20000',stock:3,inventory:[{sku:'BLUE',glass_type:'premium_borderless',opening:5,incoming:0,outgoing:2,closing:3}],sales:[{sku:'GOLD',glass_type:'privacy',sale_price:'10000',quantity:2,revenue:'20000',unit_cost:'1234',profit:'17532'}],movements:[{occurred_at:'2026-10-20T14:03:00+07:00',sku:'BLUE',glass_type:'premium_borderless',movement_type:'sale',quantity_delta:-2,balance_after:3,sales:'Phú',order_no:'899'}]};
 const sheets=reportSheets(report,false);
 assert.equal(sheets[3].rows[0][6],'899');
 assert.deepEqual(sheets[1].skuColors,['#D6A000']);assert.deepEqual(sheets[2].skuColors,['#0070C0']);assert.deepEqual(sheets[3].skuColors,['#0070C0']);
 assert.doesNotMatch(JSON.stringify(sheets),/1234|17532|Giá vốn|Lợi nhuận/);
 assert.equal(report.movements[0].order_no,'899');assert.equal(report.stock,3);
});
