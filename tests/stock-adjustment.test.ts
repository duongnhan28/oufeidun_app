import test from 'node:test';
import assert from 'node:assert/strict';
import {stockAdjustmentTarget} from '../src/lib/stock-adjustment';
import {reportSheets} from '../src/lib/report-sheets';

test('stock adjustments translate decrease/increase/count to safe targets',()=>{
 assert.equal(stockAdjustmentTarget(10,'decrease','3'),7);
 assert.equal(stockAdjustmentTarget(10,'decrease','10'),0);
 assert.equal(stockAdjustmentTarget(0,'increase','4'),4);
 assert.equal(stockAdjustmentTarget(10,'count','0'),0);
 assert.equal(stockAdjustmentTarget(10,'count','12'),12);
 for(const [current,mode,input] of [[10,'decrease','11'],[10,'increase','0'],[10,'count','10'],[0,'decrease','1'],[10,'count',''],[10,'count','-1'],[10,'count','1.5'],[10,'count','1e2'],[999999,'increase','2'],[10,'count','1000001'],[10,'bad','1']] as const)assert.throws(()=>stockAdjustmentTarget(current,mode,input));
});

test('inventory report Excel preserves adjustment reasons and existing order-code column',()=>{
 const r:any={revenue:'0',stock:7,inventory:[],movements:[{occurred_at:'2026-10-24T09:00:00+07:00',sku:'TEST',movement_type:'adjustment',quantity_delta:-3,balance_after:7,sales:'Nhân viên',order_no:null,reason:'Kiểm kê thiếu 3 tấm'}]};
 for(const costs of [true,false]){
  const sheet=reportSheets(r,costs)[3];assert.equal(sheet.columns[7],'Lý do / ghi chú');
  assert.equal(sheet.rows[0][3],-3);assert.equal(sheet.rows[0][4],7);assert.equal(sheet.rows[0][6],'');assert.equal(sheet.rows[0][7],'Kiểm kê thiếu 3 tấm');
 }
});
