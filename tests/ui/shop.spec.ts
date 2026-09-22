import { test, expect } from '@playwright/test';
test('admin adds a glass brand, assigns it, and staff can filter only',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Kho kính',exact:true}).click();
 await page.getByRole('button',{name:'Hãng kính',exact:true}).click();
 await page.getByLabel('Tên hãng kính mới').fill('Oufeidun');
 await page.getByRole('button',{name:'Thêm hãng kính',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã thêm hãng kính');
 await page.getByRole('button',{name:'Sửa IP15-TR',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Hãng kính',{exact:true}).selectOption({label:'Oufeidun'});
 await page.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã lưu sản phẩm');
 await page.getByLabel('Lọc hãng kính',{exact:true}).selectOption({label:'Oufeidun'});
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await expect(page.locator('tbody')).toContainText('IP15-TR');
 await page.screenshot({path:'test-results/glass-brands.png',fullPage:true});
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
 await page.getByRole('button',{name:/Nguyễn An/}).click();
 await page.getByRole('button',{name:'Tra cứu kính',exact:true}).click();
 await expect(page.getByRole('button',{name:'Hãng kính',exact:true})).toHaveCount(0);
 await page.getByLabel('Lọc hãng kính',{exact:true}).selectOption({label:'Oufeidun'});
 await expect(page.locator('tbody tr')).toHaveCount(1);
});
test('staff sale flow, private name, draft persistence and admin inventory UI',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:/Nguyễn An/}).click();
 await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Chọn IP15-TR',exact:true}).click();
 await page.getByRole('button',{name:'Đổi tên IP15-TR',exact:true}).click();
 await page.getByLabel('Tên hiển thị').fill('Kính riêng trên đơn thử');
 await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await expect(page.locator('.cart')).toContainText('Kính riêng trên đơn thử');
 await expect(page.locator('.product-card').filter({hasText:'IP15-TR'})).toContainText('Kính trong iPhone 15');
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã lưu');
 await page.screenshot({path:'test-results/sale-staff.png',fullPage:true});
 await page.getByRole('button',{name:'Xác nhận bán',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('25.000đ');
 await page.getByRole('button',{name:'Xác nhận và trừ kho',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã xác nhận');
 await expect(page.locator('.product-card').filter({hasText:'IP15-TR'})).toContainText('Tồn: 47');
 await page.getByRole('button',{name:'Đơn đã bán',exact:true}).click();
 await page.getByRole('button',{name:'Chi tiết'}).first().click();
 await expect(page.getByRole('dialog')).toContainText('Kính riêng trên đơn thử');
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
 await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Kho kính',exact:true}).click();
 await expect(page.getByRole('columnheader',{name:'Giá vốn',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/admin-stock.png',fullPage:true});
 await page.getByRole('button',{name:'Báo cáo',exact:true}).click();
 await expect(page.locator('.stat').filter({hasText:'Lãi gộp'})).toContainText('15.000đ');
 await page.getByLabel('Lọc báo cáo theo hãng máy').selectOption('Samsung');
 await expect(page.locator('.stat').filter({hasText:'Doanh thu thuần'})).toContainText('0đ');
 const inventory=page.locator('section.panel').filter({hasText:'Nhập – xuất – tồn trong kỳ'});
 await expect(inventory.locator('tbody tr')).toHaveCount(1);
 await expect(inventory).toContainText('SS-A55');
 await page.setViewportSize({width:1366,height:768});
 await page.getByRole('button',{name:'Bán hàng',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/desktop-1366.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('staff configures wholesale customer, custom line price and shared-product note',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Nguyễn An/}).click();
 await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Khách lẻ',exact:true}).click();
 const customer=page.getByRole('dialog');
 await customer.getByLabel('Loại khách').selectOption('wholesale');
 await customer.getByLabel('Địa chỉ giao hàng').fill('12 Nguyễn Huệ, TP.HCM');
 await customer.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await expect(page.getByRole('button',{name:/Khách sỉ · Có địa chỉ/})).toBeVisible();
 await page.getByRole('button',{name:'Chọn IP15-TR',exact:true}).click();
 await page.getByRole('button',{name:'Đổi tên IP15-TR',exact:true}).click();
 const line=page.getByRole('dialog');
 await line.getByLabel('Tên hiển thị').fill('Kính giá sỉ riêng');
 await line.getByLabel('Đơn giá bán (đ)').fill('20000');
 await line.getByLabel('Ghi chú sản phẩm / máy dùng chung').fill('Dùng chung iPhone 15 / iPhone 16');
 await line.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await expect(page.locator('.cart')).toContainText('Kính giá sỉ riêng');
 await expect(page.locator('.cart')).toContainText('20.000đ');
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã lưu');
});

test('form validation messages are displayed in Vietnamese',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await page.getByRole('button',{name:'Nhân viên',exact:true}).click();
 await page.getByRole('button',{name:'Đặt lại mật khẩu',exact:true}).first().click();
 const dialog=page.getByRole('dialog');
 await dialog.getByRole('button',{name:'Lưu tài khoản',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('Vui lòng nhập mật khẩu mới');
 await dialog.locator('input[name="password"]').fill('12345678');
 await dialog.getByRole('button',{name:'Lưu tài khoản',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('phải có ít nhất 12 ký tự');
 await expect(dialog.locator('input[name="password"]')).toHaveAttribute('aria-invalid','true');
});

test('staff form separates display name, login name and password',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await page.getByRole('button',{name:'Nhân viên',exact:true}).click();
 await page.getByRole('button',{name:'Thêm nhân viên',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Tên nhân viên',{exact:true})).toHaveAttribute('placeholder','Ví dụ: Nguyễn An');
 await expect(dialog.getByLabel('Tên đăng nhập',{exact:true})).toHaveAttribute('placeholder','Ví dụ: nguyennan');
 await expect(dialog.locator('input[name="password"]')).toHaveAttribute('placeholder','Nhập mật khẩu cho nhân viên');
});

test('store owner can open name and password forms while remaining admin',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await page.getByRole('button',{name:'Nhân viên',exact:true}).click();
 const adminRow=page.locator('tbody tr').filter({hasText:'Admin'});
 await adminRow.getByRole('button',{name:'Sửa tên',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('quyền quản trị không thay đổi');
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await adminRow.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();
 await expect(page.getByRole('dialog').locator('input[name="password"]')).toHaveAttribute('placeholder','Nhập mật khẩu mới');
});

test('admin can open a safe staff deletion confirmation',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await page.getByRole('button',{name:'Nhân viên',exact:true}).click();
 const staffRow=page.locator('tbody tr').filter({hasText:'Nhân viên'}).first();
 await staffRow.getByRole('button',{name:'Xóa',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toContainText('Đơn hàng và lịch sử thao tác cũ vẫn được giữ nguyên');
 await expect(dialog.getByRole('button',{name:'Xóa tài khoản',exact:true})).toHaveClass(/danger/);
});

test('mobile sale and order feature dialogs do not overflow horizontally',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');await page.getByRole('button',{name:/Nguyễn An/}).click();
 await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Chọn IP15-TR',exact:true}).click();
 await page.getByRole('button',{name:'Đổi tên IP15-TR',exact:true}).click();
 await expect(page.getByLabel('Đơn giá bán (đ)')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/mobile-order-features.png',fullPage:true});
});
