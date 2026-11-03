import {test,expect} from '@playwright/test';import ExcelJS from 'exceljs';
for(const role of [/Chủ cửa hàng/,/Nguyễn An/])test(`draft forecast stays advisory and exported delivered quantity is not subtracted twice (${role})`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:role}).click();
 const nav=async(name:string)=>page.getByRole('button',{name,exact:true}).click();
 await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
 await page.getByLabel('Mã đơn hàng',{exact:true}).fill('FORECAST-OLD');await page.getByLabel('Tên khách hàng',{exact:true}).fill('Khách chờ');await page.getByLabel('Số điện thoại',{exact:true}).fill('0');
 await nav('Thêm IP15-TR');await page.getByLabel('Số lượng IP15-TR',{exact:true}).fill('45');await nav('Thêm hàng tặng IP15-TR');await page.locator('.cart-item').first().getByRole('button',{name:'Thêm hàng mẫu IP15-TR',exact:true}).click();
 await nav('Lưu bản nháp');await expect(page.getByRole('status')).toContainText('Đã lưu');await expect(page.getByRole('button',{name:'Lưu bản nháp',exact:true})).toBeEnabled();
 await nav('Đơn mới');await page.getByLabel('Mã đơn hàng',{exact:true}).fill('FORECAST-NEW');await page.getByLabel('Tên khách hàng',{exact:true}).fill('Khách mới');await page.getByLabel('Số điện thoại',{exact:true}).fill('0');await nav('Thêm IP15-TR');await page.getByLabel('Số lượng IP15-TR',{exact:true}).fill('3');
 await expect(page.locator('.cart-items')).toContainText('Dự kiến thiếu 2 tấm');await nav('Lưu bản nháp');await expect(page.getByRole('button',{name:'Lưu bản nháp',exact:true})).toBeEnabled();
 await expect(page.locator('.cart-items')).toContainText('Dự kiến sau đơn này: -2 tấm');
 await nav('Kho hàng');await nav('Tồn dự kiến');const panel=page.getByRole('region',{name:'Tồn dự kiến'}),row=panel.locator('tbody tr').filter({hasText:'IP15-TR'});
 await expect(row).toContainText('50');await expect(row.locator('td').nth(2)).toHaveText('48');await expect(row.locator('td').nth(4)).toHaveText('-2');
 const dl=page.waitForEvent('download');await panel.getByRole('button',{name:'Tải Excel tồn dự kiến'}).click();const book=new ExcelJS.Workbook();await book.xlsx.readFile((await(await dl).path())!);const values=book.worksheets[0].getSheetValues();expect(JSON.stringify(values)).toContain('-2');expect(book.worksheets).toHaveLength(2);
 await page.screenshot({path:`test-results/stock-forecast-${role.source.includes('An')?'staff':'admin'}.png`});
});
