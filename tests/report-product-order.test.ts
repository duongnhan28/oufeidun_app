import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {reportSheets} from '../src/lib/report-sheets';
import {sortReportProducts} from '../src/lib/report-product-order';

test('report export follows all 84 rows of the customer workbook, appends new models and preserves figures/access',async()=>{
 const source=new ExcelJS.Workbook();await source.xlsx.readFile('tests/fixtures/report-product-order.xlsx');
 const expected:string[]=[];source.getWorksheet('Sheet1')!.eachRow(row=>expected.push(row.getCell(1).text.trim()));
 assert.equal(expected.length,84);
 const row=(sku:string,index:number)=>({sku,name:sku,glass_type:index>=67?'premium_borderless':index>=24&&index<43?'privacy':'clear',quantity:index+1,sale_price:'25000',revenue:String((index+1)*25000),unit_cost:'11234',total_cost:String((index+1)*11234),profit:String((index+1)*13766),opening:index+10,incoming:3,outgoing:2,closing:index+11});
 const newRows=[row('MẪU MỚI Z',85),row('MẪU MỚI A',86)];
 const input=[newRows[0],...expected.map(row).reverse(),newRows[1]];
 const movement={sku:'MẪU MỚI A',occurred_at:'2026-11-12T12:00:00+07:00',quantity_delta:-1,balance_after:5,sales:'Phú',order_no:'954',movement_type:'sale'};
 const report:any={revenue:'65000',product_revenue:'60000',other_charges:'5000',stock:100,sales:input,inventory:input,movements:[movement]};
 const original=JSON.stringify(report);input.forEach(Object.freeze);Object.freeze(input);
 for(const canSeeCosts of [true,false]){
  const sheets=reportSheets(report,canSeeCosts);
  for(const sheet of [sheets[1],sheets[2]])assert.deepEqual(sheet.rows.map(row=>row[0]),[...expected,'MẪU MỚI Z','MẪU MỚI A']);
  assert.equal(sheets[1].rows.length,86);assert.equal(sheets[2].rows.length,86);
  assert.deepEqual(sheets[2].rows[0].slice(1,5),[10,3,2,11]);
  assert.equal(sheets[1].rows[0][canSeeCosts?5:3],25000);
  assert.equal(sheets[1].rows[83][canSeeCosts?3:2],84);
  assert.equal(sheets[1].skuColors![0],'#000000');assert.equal(sheets[1].skuColors![24],'#D6A000');assert.equal(sheets[2].skuColors![67],'#0070C0');
  assert.equal(sheets[3].rows[0][1],movement.sku);assert.equal(sheets[3].rows[0][6],'954');
  assert.deepEqual(sheets[0].rows.find(row=>row[0]==='Doanh thu'),['Doanh thu',65000]);
  if(!canSeeCosts)assert.doesNotMatch(JSON.stringify(sheets),/Giá vốn|Tổng vốn|lợi nhuận|11234/i);
 }
 assert.equal(JSON.stringify(report),original);
});

test('complete model labels tolerate real SKU category prefixes, slash order, spacing and privacy spelling',()=>{
 const expected=[
  'FULL VIỀN IP X/XS/11PRO', 'full viền IP Xr / 11', 'FULL VIỀN IP 12/12 Pro',
  'CNT IP XR/11(PRIVACY)', 'CNT IP X/11PRO(PRIVACY)',
  'FULL VIỀN SAM A16', 'FULL VIỀN RM 14C (REDMI 14C)', 'FULL VIỀN REALME C55',
  'KHÔNG VIỀN IP X/11PRO/XS', 'KHÔNG VIỀN IP17PRO/18PRO',
 ];
 const rows=expected.map(sku=>({sku})).reverse();
 assert.deepEqual(sortReportProducts(rows).map(row=>row.sku),expected);
});

test('unknown models/variants stay below known models without fuzzy matching, merging price rows or reordering unknowns',()=>{
 const newA={sku:'FULL VIỀN SAM A160'},newB={sku:'FULL VIỀN IP 15PROMAX(999)'},newC={sku:'MẪU MỚI A'};
 const first={sku:'FULL VIỀN IP 15PROMAX (HQT)',price:1},second={...first,price:2};
 const rows=[newA,{sku:'FULL VIỀN IP15PROMAX(330)'},first,newB,second,newC];
 assert.deepEqual(sortReportProducts(rows),[first,second,rows[1],newA,newB,newC]);
 assert.deepEqual(sortReportProducts([]),[]);
 const clear={sku:'FULL VIỀN IP12/12PRO',glass_type:'clear'};
 const privacy={sku:'FULL VIỀN IP12/12PRO',glass_type:'privacy'};
 const matte={sku:'FULL VIỀN IP X/XS/11PRO',glass_type:'matte'};
 assert.deepEqual(sortReportProducts([matte,privacy,clear]),[clear,privacy,matte]);
});

test('renamed products retain the old template position and current recognized labels take priority',()=>{
 const catalog=[{id:'renamed',sku:'MÃ HIỆN TẠI',glass_type:'clear',sku_aliases:['FULL VIỀN IP X/XS/11PRO']}];
 const unknown={sku:'MẪU MỚI'},renamed={sku:'MÃ HIỆN TẠI',product_id:'renamed'};
 const known={sku:'FULL VIỀN IP12/12PRO',sku_aliases:['FULL VIỀN IP X/XS/11PRO']};
 const middle={sku:'FULL VIỀN IP XR/11'};
 assert.deepEqual(sortReportProducts([unknown,known,middle,renamed],catalog),[renamed,middle,known,unknown]);
});
