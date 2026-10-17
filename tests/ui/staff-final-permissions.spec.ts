import {test,expect} from '@playwright/test';

test('staff publishes catalog prices for future orders and Admin while preserving cost',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Nguyễn An/}).click();await page.getByRole('button',{name:'Thêm IP15-TR',exact:true}).click();await page.getByRole('button',{name:'Tùy chỉnh IP15-TR',exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByLabel('Giá bán thực tế (đ)').fill('15000');await dialog.getByLabel('Phạm vi áp dụng giá').selectOption('catalog_retail');await dialog.getByRole('button',{name:'Áp dụng',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu giá lẻ chung');
 for(const sku of ['IP15-TR','SS-A55','IP14PM'])await expect(page.locator('.product-card').filter({hasText:sku})).toContainText('15.000đ');
 await expect(page.locator('.product-card').filter({hasText:'IP15-CNT'})).toContainText('45.000đ');
 // The unsaved cart is not persisted across logout; the catalog change is.
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Bỏ thay đổi',exact:true}).click();await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await expect(page.locator('.product-card').filter({hasText:'IP15-TR'})).toContainText('15.000đ');
 await page.getByRole('button',{name:'Kho hàng',exact:true}).click();await page.getByRole('button',{name:'Sửa IP15-TR',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Giá vốn cố định (đ)',{exact:true})).toHaveValue('10000');
});

test('staff returns and exchanges an Admin sale, and cancels another Admin sale',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 for(const code of ['ADMIN-RETURN-FINAL','ADMIN-CANCEL-FINAL']){
  await page.getByLabel('Mã đơn hàng',{exact:true}).fill(code);await page.getByLabel('Tên khách hàng',{exact:true}).fill('Khách quyền cuối');await page.getByLabel('Số điện thoại',{exact:true}).fill('0901234567');await page.getByRole('button',{name:'Thêm IP15-TR',exact:true}).click();await page.getByRole('button',{name:'Xác nhận bán',exact:true}).click();await page.getByRole('button',{name:'Xác nhận và trừ kho',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã xác nhận');
 }
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('button',{name:/Nguyễn An/}).click();await page.getByRole('button',{name:'Đơn hàng',exact:true}).click();
 const row=(code:string)=>page.locator('tbody tr').filter({hasText:code});
 await row('ADMIN-RETURN-FINAL').getByRole('button',{name:'Chi tiết',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Trả / đổi hàng',exact:true}).click();let dialog=page.getByRole('dialog');await dialog.getByLabel('Trả IP15-TR',{exact:true}).fill('1');await dialog.getByLabel('Nhập lại IP15-TR',{exact:true}).fill('1');await dialog.getByLabel('Lý do trả hàng',{exact:true}).fill('Đổi theo khách');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Ghi nhận trả hàng',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã ghi nhận phiếu trả');await expect(row('ADMIN-RETURN-FINAL')).toContainText('Đã trả hết');
 await row('ADMIN-RETURN-FINAL').getByRole('button',{name:'Chi tiết',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByText('Lịch sử trả hàng (1)',{exact:true}).click();await dialog.getByRole('button',{name:'Tạo đơn đổi',exact:true}).click();await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();await expect(page.getByLabel('Ghi chú đơn hàng')).toHaveValue(/Đổi hàng từ phiếu trả/);
 await page.getByRole('button',{name:'Đơn hàng',exact:true}).click();await row('ADMIN-CANCEL-FINAL').getByRole('button',{name:'Chi tiết',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Hủy toàn bộ',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Lý do',{exact:true}).fill('Khách hủy');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Hủy và hoàn kho',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã hủy đơn');await expect(row('ADMIN-CANCEL-FINAL')).toContainText('Đã hủy');
});
