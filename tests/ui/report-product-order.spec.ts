import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
import {productExcelColumns} from '../../src/lib/product-excel';

test('report workbook orders template products first for admin and staff, keeping new models, amounts and SKU colors',async({page})=>{
 const known=['FULL VIỀN IP X/11PRO/XS','CNT IP XR/11(PRIVACY)','FULL VIỀN SAM A15','KHÔNG VIỀN IP X/XS/11PRO'];
 const added=['MẪU MỚI ZZ','MẪU MỚI AA'];
 const selection=[added[0],known[1],known[2],added[1],known[3],known[0]];
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Kho hàng',exact:true}).click();
 const input=new ExcelJS.Workbook(),sheet=input.addWorksheet('Danh mục');sheet.addRow(productExcelColumns);
 for(const sku of selection)sheet.addRow([sku,sku.startsWith('CNT')?'privacy':sku.startsWith('KHÔNG')?'premium_borderless':'clear','Apple','',25000,20000,1234,'',5]);
 await page.getByRole('button',{name:'Nhập hàng',exact:true}).click();await page.getByRole('button',{name:'Nhập bằng Excel',exact:true}).click();
 await page.getByLabel('Chọn file Excel đã điền').setInputFiles({name:'report-models.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await input.xlsx.writeBuffer())});
 await page.getByRole('button',{name:'Nhập file Excel',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Bán hàng',exact:true}).click();
 await page.getByLabel('Mã đơn hàng',{exact:true}).fill('REPORT-TEMPLATE-ORDER');await page.getByLabel('Tên khách hàng',{exact:true}).fill('Khách thứ tự báo cáo');await page.getByLabel('Số điện thoại',{exact:true}).fill('0');
 for(const sku of selection)await page.getByRole('button',{name:`Thêm ${sku}`,exact:true}).click();
 await page.getByRole('button',{name:'Xác nhận bán',exact:true}).click();await page.getByRole('button',{name:'Xác nhận và trừ kho',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Xác nhận bán hàng'})).toHaveCount(0);
 await page.getByRole('button',{name:'Báo cáo',exact:true}).click();
 const check=async(admin:boolean)=>{
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Tải báo cáo Excel',exact:true}).click();
  const book=new ExcelJS.Workbook();await book.xlsx.readFile((await(await event).path())!);
  expect(book.worksheets.map(s=>s.name)).toEqual(['Tổng quan','Báo cáo bán hàng','Nhập xuất tồn','Chi tiết kho']);
  for(const name of ['Báo cáo bán hàng','Nhập xuất tồn']){
   const tab=book.getWorksheet(name)!,codes:string[]=[];tab.eachRow((row,index)=>{if(index>1)codes.push(row.getCell(1).text);});
   // Inventory also contains the demo's SAM-A12, which belongs before the
   // borderless group. Preserve it rather than assuming only imported rows.
   expect(codes.filter(code=>known.includes(code))).toEqual(known);
   expect(codes.slice(0,name==='Nhập xuất tồn'?5:4)).toEqual(name==='Nhập xuất tồn'?[...known.slice(0,3),'SAM-A12',known[3]]:known);
   for(const sku of added)expect(codes.indexOf(sku)).toBeGreaterThan(codes.indexOf(known[3]));
   for(const [sku,color]of [[known[0],'FF000000'],[known[1],'FFD6A000'],[known[3],'FF0070C0']])expect((tab.getCell(codes.indexOf(sku)+2,1).font.color as any)?.argb).toBe(color);
  }
  const sales=book.getWorksheet('Báo cáo bán hàng')!;expect(sales.rowCount).toBe(7);
  let total=0;sales.eachRow((row,index)=>{if(index>1)total+=Number(row.getCell(admin?6:4).value);});expect(total).toBe(150000);
  if(!admin)expect(JSON.stringify(book.worksheets.map(s=>s.getSheetValues()))).not.toMatch(/Giá vốn|Tổng vốn|lợi nhuận|1234/i);
 };
 await check(true);
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('button',{name:/Nguyễn An/}).click();
 await page.getByRole('button',{name:'Báo cáo',exact:true}).click();await check(false);
});
