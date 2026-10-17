import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { readInventoryWorkbook } from '../src/lib/excel';

async function file(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet=workbook.addWorksheet('Nhập kho');
  rows.forEach(row=>sheet.addRow(row));
  return new File([await workbook.xlsx.writeBuffer() as BlobPart], 'nhap.xlsx');
}
test('Excel import validates all rows before inventory mutation', async () => {
  const header=['Mã kính','Số lượng','Giá nhập'];
  assert.deepEqual(await readInventoryWorkbook(await file([header,[' ip15-tr ',2,12000],['','','']])),[{sku:'IP15-TR',quantity:2,purchase_price:'12000'}]);
  assert.deepEqual(await readInventoryWorkbook(await file([header,['A','1.000','12.000đ']])),[{sku:'A',quantity:1000,purchase_price:'12000'}]);
  await assert.rejects(readInventoryWorkbook(await file([header,['A',1,12000],['a',2,10000]])),/Dòng 3.*bị lặp/);
  await assert.rejects(readInventoryWorkbook(await file([header,['A',1.5,12000]])),/Dòng 2: Số lượng/);
  await assert.rejects(readInventoryWorkbook(await file([header,['A',0,12000]])),/Số lượng phải từ 1/);
  await assert.rejects(readInventoryWorkbook(await file([header,['A'.repeat(51),1,12000]])),/Mã kính tối đa 50/);
  await assert.rejects(readInventoryWorkbook(await file([header,['A',1,'12,50']])),/Dòng 2: Giá nhập/);
  await assert.rejects(readInventoryWorkbook(await file([header,['A',1,null]])),/Dòng 2: Giá nhập/);
  await assert.rejects(readInventoryWorkbook(await file([header,['A',{formula:'1+1'},10000]])),/lưu lại file/);
  await assert.rejects(readInventoryWorkbook(await file([header,...Array.from({length:101},(_,i)=>[`A${i}`,1,10000])])),/tối đa 100/);
  await assert.rejects(readInventoryWorkbook(await file([header])),/chưa có dòng/);
  await assert.rejects(readInventoryWorkbook(new File(['bad'],'nhap.xlsx')),/Không đọc được/);
  await assert.rejects(readInventoryWorkbook(new File(['bad'],'nhap.xls')),/\.xlsx/);
});
