import {test,expect} from '@playwright/test';

test('admin saves a category price from the cart; catalog, new lines and later staff orders use it',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
 const card=(sku:string)=>page.locator('.product-card').filter({hasText:sku});
 await page.getByLabel('Mã đơn hàng',{exact:true}).fill('SHARED-PRICE');await page.getByLabel('Tên khách hàng',{exact:true}).fill('Giá chung');await page.getByLabel('Số điện thoại',{exact:true}).fill('0901234567');
 await page.getByRole('button',{name:'Thêm IP15-TR',exact:true}).click();await page.getByRole('button',{name:'Thêm IP14PM',exact:true}).click();await page.getByRole('button',{name:'Thêm IP15-CNT',exact:true}).click();
 const line=page.locator('.cart-item').filter({hasText:'IP15-TR'}).first();await line.getByRole('button',{name:'Thêm hàng tặng IP15-TR',exact:true}).click();await line.getByRole('button',{name:'Thêm hàng mẫu IP15-TR',exact:true}).click();
 await line.getByRole('button',{name:'Tùy chỉnh IP15-TR',exact:true}).click();let editor=page.getByRole('dialog');await editor.getByLabel('Giá bán thực tế (đ)').fill('15000');await editor.getByLabel('Phạm vi áp dụng giá').selectOption('catalog_retail');
 await page.screenshot({path:'test-results/shared-category-price-editor.png'});
 // Cancel must never publish a catalog update.
 await editor.getByRole('button',{name:'Đóng',exact:true}).click();await expect(card('IP15-TR')).toContainText('25.000đ');
 await line.getByRole('button',{name:'Tùy chỉnh IP15-TR',exact:true}).click();editor=page.getByRole('dialog');await editor.getByLabel('Giá bán thực tế (đ)').fill('15000');await editor.getByLabel('Phạm vi áp dụng giá').selectOption('catalog_retail');await editor.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã lưu giá lẻ chung');await expect(card('IP15-TR')).toContainText('15.000đ');await expect(card('IP14PM')).toContainText('15.000đ');await expect(card('IP15-CNT')).toContainText('45.000đ');await expect(line).toContainText('15.000đ');
 const free=page.locator('.cart-item').filter({has:page.locator('.badge.amber')});await expect(free).toHaveCount(2);for(const item of await free.all())await expect(item).toContainText('0đ');
 await page.getByRole('button',{name:'Thêm SS-A55',exact:true}).click();await expect(page.locator('.cart-item').filter({hasText:'SS-A55'})).toContainText('15.000đ');
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu');await page.getByRole('button',{name:'Đơn mới',exact:true}).click();
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('button',{name:/Nguyễn An/}).click();await expect(card('IP15-TR')).toContainText('15.000đ');await page.getByRole('button',{name:'Thêm IP15-TR',exact:true}).click();await page.getByRole('button',{name:'Tùy chỉnh IP15-TR',exact:true}).click();
 await expect(page.getByRole('dialog').getByLabel('Phạm vi áp dụng giá').locator('option')).toHaveCount(4);
});

test('wholesale catalog update is separate from retail and free rows cannot publish it',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});await page.getByRole('button',{name:'Thêm IP15-CNT',exact:true}).click();await page.getByRole('button',{name:'Tùy chỉnh IP15-CNT',exact:true}).click();
 let editor=page.getByRole('dialog');await editor.getByLabel('Giá bán thực tế (đ)').fill('15000');await editor.getByLabel('Phạm vi áp dụng giá').selectOption('catalog_wholesale');await editor.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã lưu giá sỉ chung');await expect(page.locator('.product-card').filter({hasText:'IP15-CNT'})).toContainText('45.000đ');
 await page.getByRole('button',{name:'Tùy chỉnh IP15-CNT',exact:true}).click();editor=page.getByRole('dialog');await editor.getByLabel('Loại hàng').selectOption('gift');await editor.getByLabel('Phạm vi áp dụng giá').selectOption('catalog_retail');await editor.getByRole('button',{name:'Áp dụng',exact:true}).click();await expect(page.getByRole('alert')).toContainText('hàng tặng/mẫu giữ giá 0đ');await expect(editor).toBeVisible();
 await editor.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByLabel('Loại khách',{exact:true}).selectOption('wholesale');await page.getByRole('button',{name:'Giữ các giá đã chỉnh',exact:true}).click();await expect(page.locator('.product-card').filter({hasText:'IP15-CNT'})).toContainText('15.000đ');
});

test('publishing a zero category price requires explicit confirmation',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});await page.getByRole('button',{name:'Thêm IP15-CNT',exact:true}).click();await page.getByRole('button',{name:'Tùy chỉnh IP15-CNT',exact:true}).click();
 const editor=page.getByRole('dialog');await editor.getByLabel('Giá bán thực tế (đ)').fill('00');await editor.getByLabel('Phạm vi áp dụng giá').selectOption('catalog_retail');await editor.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(editor).toBeVisible();await expect(page.locator('.product-card').filter({hasText:'IP15-CNT'})).toContainText('45.000đ');
 await editor.locator('input[name="zero_price_confirm"]').check();await editor.getByRole('button',{name:'Áp dụng',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu giá lẻ chung 0đ');await expect(page.locator('.product-card').filter({hasText:'IP15-CNT'}).locator('.product-price b')).toHaveText('0đ');
});
