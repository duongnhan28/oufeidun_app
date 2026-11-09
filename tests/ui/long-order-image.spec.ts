import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
import {readFile} from 'node:fs/promises';
import {productExcelColumns} from '../../src/lib/product-excel';

test('long invoice exports one compact high-resolution PNG with every row and one complete total',async({page})=>{
  test.setTimeout(120000);
  await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
  await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
  const skus=Array.from({length:34},(_,index)=>`RV-${String(index+1).padStart(2,'0')} FULL VIỀN IPHONE 12/13 PRO MAX`);
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Nhập kho');sheet.addRow(productExcelColumns);
  for(const [index,sku]of skus.entries())sheet.addRow([sku,'Kính full viền','Apple','Oufeidun',7500,7500,1000,index===31?'iPhone 12, iPhone 13, iPhone 14 Pro Max':'',30]);
  await page.getByRole('button',{name:'Kho hàng',exact:true}).click();
  await page.getByRole('button',{name:'Nhập hàng',exact:true}).click();await page.getByRole('button',{name:'Nhập bằng Excel',exact:true}).click();
  await page.getByLabel('Chọn file Excel đã điền').setInputFiles({name:'long-invoice.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await book.xlsx.writeBuffer())});
  await page.getByRole('button',{name:'Nhập file Excel',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã cộng');
  await page.getByRole('button',{name:'Bán hàng',exact:true}).click();
  await page.getByLabel('Mã đơn hàng',{exact:true}).fill('LONG-34');await page.getByLabel('Tên khách hàng',{exact:true}).fill('Khách kiểm tra ảnh dài');await page.getByLabel('Số điện thoại',{exact:true}).fill('0900000000');
  for(const sku of skus){await page.getByRole('button',{name:`Thêm ${sku}`,exact:true}).click();await page.getByLabel(`Số lượng ${sku}`,{exact:true}).fill('10');}
  await page.getByRole('button',{name:`Thêm hàng tặng ${skus[0]}`,exact:true}).click();
  await page.locator('.cart-item').first().getByRole('button',{name:`Thêm hàng mẫu ${skus[0]}`,exact:true}).click();
  await page.getByLabel('Chi phí khác (đ)',{exact:true}).fill('5000');await page.getByLabel('Ghi chú đơn hàng').fill('Kiểm tra số lượng trước khi nhận.');
  await page.evaluate(()=>{
    const original=CanvasRenderingContext2D.prototype.fillText;
    const ids=new WeakMap<HTMLCanvasElement,number>();let next=0;
    (window as any).invoiceDraws=[];
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
      if(!ids.has(this.canvas))ids.set(this.canvas,next++);
      (window as any).invoiceDraws.push({page:ids.get(this.canvas),text,x,y,width:this.canvas.width,height:this.canvas.height});
      return original.call(this,text,x,y,...rest);
    };
  });
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Tải ảnh xác nhận',exact:true}).click();
  const download=await downloading;expect(download.suggestedFilename()).not.toContain('-trang-');
  const file='test-results/long-order-compact.png';await download.saveAs(file);
  const png=await readFile(file);expect(png.readUInt32BE(16)).toBe(2400);expect(png.readUInt32BE(20)).toBeLessThan(5000);
  const draws=await page.evaluate(()=>(window as any).invoiceDraws) as {page:number;text:string;x:number;height:number;width:number}[];
  expect(new Set(draws.map(row=>row.page)).size).toBe(1);
  expect(draws.filter(row=>row.x===38&&/^\d+$/.test(row.text)).map(row=>Number(row.text))).toEqual(Array.from({length:36},(_,index)=>index+1));
  expect(draws.filter(row=>/^RV-\d\d/.test(row.text)).map(row=>row.text.match(/^RV-\d\d/)![0])).toEqual(['RV-01','RV-01',...skus.slice(1).map(sku=>sku.slice(0,5)),'RV-01']);
  expect(draws.filter(row=>row.text==='2.555.000đ')).toHaveLength(1);
  expect(draws.filter(row=>row.text==='342')).toHaveLength(1);
  expect(draws.filter(row=>row.x===716&&row.text==='—')).toHaveLength(37);
  expect(draws.filter(row=>row.x===816&&row.text==='—')).toHaveLength(37);
  expect(draws.some(row=>row.text==='Ghi chú: Kiểm tra số lượng trước khi nhận.')).toBe(true);
  expect(draws.some(row=>row.text==='THEO DÕI ĐƠN HÀNG')).toBe(true);
  await page.getByRole('button',{name:'Đơn hàng',exact:true}).click();await page.locator('tbody tr').filter({hasText:'LONG-34'}).getByRole('button',{name:'Chi tiết',exact:true}).click();
  await page.getByRole('button',{name:'Xem ảnh xác nhận',exact:true}).click();
  const preview=page.getByRole('dialog',{name:'Xem trước ảnh xác nhận đơn hàng'});
  await expect(preview).toBeVisible();await expect(preview.getByRole('button',{name:'Trang sau',exact:true})).toHaveCount(0);
  await page.screenshot({path:'test-results/long-order-compact-preview.png'});
  await preview.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('button',{name:'Bán hàng',exact:true}).click();
  await expect(page.locator('.cart-summary .total')).toContainText('2.555.000đ');
});
