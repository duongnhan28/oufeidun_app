import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('staff manages products and customers, sees operational pages, but cannot receive stock or see cost data',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Nguyễn An/}).click();
 await page.getByRole('button',{name:'Kho hàng',exact:true}).click();
 for(const name of ['Nhập hàng','Tồn đầu kỳ'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
 await expect(page.getByRole('columnheader',{name:'Giá vốn',exact:true})).toHaveCount(0);
 for(const name of ['Thương hiệu','Bảng giá đồng loạt','Thêm sản phẩm','Điều chỉnh tồn','Xuất kho'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sửa IP15-TR',exact:true}).click();let dialog=page.getByRole('dialog');
 await expect(dialog.locator('[name="fixed_cost"]')).toHaveCount(0);await expect(dialog.locator('[name="initial_quantity"]')).toHaveCount(0);
 await dialog.getByLabel('Giá bán (đ)',{exact:true}).fill('27000');await dialog.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu sản phẩm');
 await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Mã kính',{exact:true}).fill('STAFF-NEW-SKU');await dialog.getByLabel('Giá bán (đ)',{exact:true}).fill('18000');
 await expect(dialog.locator('[name="fixed_cost"], [name="initial_quantity"]')).toHaveCount(0);await dialog.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu sản phẩm');await expect(page.locator('tbody tr').filter({hasText:'STAFF-NEW-SKU'})).toContainText('0 tấm');
 await page.getByRole('button',{name:'Bảng giá đồng loạt',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.locator('[name="fixed_cost"]')).toHaveCount(0);await dialog.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.getByRole('button',{name:'Khách hàng',exact:true}).click();await expect(page.getByRole('button',{name:'Thêm khách hàng',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Nhân viên',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Thêm nhân viên',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Báo cáo',exact:true}).click();await expect(page.getByRole('button',{name:'Tải báo cáo Excel',exact:true})).toBeEnabled();
 for(const name of ['Giá vốn','Tổng vốn','Lợi nhuận'])await expect(page.getByRole('columnheader',{name,exact:true})).toHaveCount(0);
 await expect(page.locator('.stat').filter({hasText:'Lãi gộp'})).toHaveCount(0);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Tải báo cáo Excel',exact:true}).click();const book=new ExcelJS.Workbook();await book.xlsx.readFile((await(await download).path())!);const values=JSON.stringify(book.worksheets.map(s=>s.getSheetValues()));expect(values).not.toMatch(/Giá vốn|Tổng vốn|lợi nhuận/);
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await page.getByRole('button',{name:'Kho hàng',exact:true}).click();await page.getByRole('button',{name:'Sửa IP15-TR',exact:true}).click();await expect(page.getByRole('dialog').getByLabel('Giá vốn cố định (đ)',{exact:true})).toHaveValue('10000');
 await page.screenshot({path:'test-results/shared-operations-admin-cost-preserved.png'});
});
