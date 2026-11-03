import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';
import { productExcelColumns } from '../../src/lib/product-excel';
test('new Excel template imports catalog with quantities, updates prices and displays stock beside SKU',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Kho hàng',exact:true}).click();
 async function open(){await page.getByRole('button',{name:'Nhập hàng',exact:true}).click();await page.getByRole('button',{name:'Nhập bằng Excel',exact:true}).click();}
 await open();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Tải file Excel mẫu',exact:true}).click();
 const download=await downloadPromise,wb=new ExcelJS.Workbook();await wb.xlsx.readFile((await download.path())!);
 expect(wb.getWorksheet('Nhập kho')!.getRow(1).values).toEqual([undefined,...productExcelColumns]);
 expect(wb.getWorksheet('Nhập kho')!.rowCount).toBe(1);
 const ws=wb.getWorksheet('Nhập kho')!;
 ws.addRow(['CAT-UI','Kính trong','Samsung','Oufeidun',30000,24000,12000,'Samsung A15, Samsung A16, OPPO A58/A60',4]);
 ws.addRow(['IP15-TR','Chống nhìn trộm','Apple','',40000,35000,15000,'iPhone 15, iPhone 16',5]);
 async function upload(expected='Đã cộng 9 tấm vào kho'){await page.getByLabel('Chọn file Excel đã điền').setInputFiles({name:'catalog.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});await page.getByRole('button',{name:'Nhập file Excel',exact:true}).click();await expect(page.getByRole('status')).toContainText(expected);}
 await page.screenshot({path:'test-results/catalog-import-form.png'});
 await upload();
 const row=page.locator('tbody tr').filter({hasText:'CAT-UI'}),old=page.locator('tbody tr').filter({hasText:'IP15-TR'});
 await expect(row).toContainText('4 tấm');await expect(old).toContainText('53 tấm');
 await expect(page.getByRole('columnheader',{name:'Số lượng tồn',exact:true})).toBeVisible();
 await expect(row.locator('td').nth(1).locator('.badge')).toHaveText('4 tấm');
 await expect(row.locator('td').nth(1)).toContainText('Trong nháp: 0 · Dự kiến: 4');
 await page.getByRole('button',{name:'Sửa CAT-UI',exact:true}).click();
 await expect(page.getByLabel('Giá bán (đ)',{exact:true})).toHaveValue('30000');
 await expect(page.getByLabel('Giá sỉ mặc định (đ)',{exact:true})).toHaveValue('24000');
 await expect(page.getByLabel('Giá vốn cố định (đ)',{exact:true})).toHaveValue('12000');
 await expect(page.getByLabel(/Mã\/dòng máy dùng chung/)).toHaveValue('Samsung A15\nSamsung A16\nOPPO A58/A60');
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 ws.getCell('I2').value=0;ws.getCell('I3').value=0;
 await open();await upload('Tồn kho được giữ nguyên');await expect(row).toHaveCount(1);await expect(row).toContainText('4 tấm');
 await page.reload();await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Kho hàng',exact:true}).click();await expect(row).toContainText('4 tấm');await expect(old).toContainText('53 tấm');
 await page.setViewportSize({width:1000,height:700});
 const quantityBox=await row.locator('.stock-quantity').boundingBox();expect(quantityBox!.x+quantityBox!.width).toBeLessThan(1000);
 await page.screenshot({path:'test-results/warehouse-quantity-column.png'});
});
