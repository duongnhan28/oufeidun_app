import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { productExcelColumns, readProductWorkbook } from '../src/lib/product-excel';
async function file(rows: unknown[][], columns=productExcelColumns) {
 const wb=new ExcelJS.Workbook(); wb.addWorksheet('Ghi chú').addRow(['Không phải dữ liệu']);
 const ws=wb.addWorksheet('Danh mục'); ws.addRow(columns); rows.forEach(row=>ws.addRow(row));
 return new File([await wb.xlsx.writeBuffer() as BlobPart],'catalog.xlsx');
}
test('catalog parses quantity, screenshot headers, commas, prices and rejects invalid whole files',async()=>{
 const row=[' ip16 ', 'Kính trong','Apple','Oufeidun','25.000đ',20000,{formula:'5000+5000',result:10000},'iPhone 15, iPhone 16, OPPO A58/A60, iPhone 15',4];
 const rows=await readProductWorkbook(await file([row],productExcelColumns.map((h,i)=>i===7?'Mã/dòng máy dùng chung - mỗi dòng một mã':h)));
 assert.deepEqual(rows,[{sku:'IP16',glass_type:'clear',brand:'Apple',glass_brand:'Oufeidun',sale_price:'25000',wholesale_price:'20000',fixed_cost:'10000',models:['iPhone 15','iPhone 16','OPPO A58/A60'],quantity:4}]);
 for(const [index,value,pattern] of [[0,'',/Dòng 2.*Mã kính/],[1,'không biết',/Loại kính/],[4,'',/Giá bán/],[5,-1,/Giá sỉ/],[6,{formula:'1+1'},/kết quả/]] as const){const bad=[...row];bad[index]=value;await assert.rejects(readProductWorkbook(await file([bad])),pattern);}
 await assert.rejects(readProductWorkbook(await file([row,row])),/Dòng 3.*bị lặp/);
 await assert.rejects(readProductWorkbook(await file([['','','','','','','','Cách bằng dấu phẩy nhe anh']])),/Mã kính/);
 await assert.rejects(readProductWorkbook(await file([])),/chưa có/);
 assert.equal(await readProductWorkbook(await file([['A',1,100]],['Mã kính','Số lượng','Giá nhập'])),null);
 const blank=[...row];blank[2]='';blank[3]='';blank[7]='';blank[4]=0;
 assert.equal((await readProductWorkbook(await file([blank])))![0].sale_price,'0');
 for(const quantity of ['',null,-1,1.5,1000001,'1,5',{formula:'1+1'}]){await assert.rejects(readProductWorkbook(await file([[...row.slice(0,8),quantity]])),/Dòng 2: Số lượng/);}
 for(const [value,expected] of [[0,0],['1.000',1000],[{formula:'1+1',result:2},2]] as const) assert.equal((await readProductWorkbook(await file([[...row.slice(0,8),value]])))![0].quantity,expected);
 assert.equal((await readProductWorkbook(await file([row.slice(0,8)],productExcelColumns.slice(0,8))))![0].quantity,0);
});
