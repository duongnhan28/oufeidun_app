import {test,expect} from '@playwright/test';

test('different customers using phone 0 persist across draft saves, reload and staff login',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 const names=['Khách An','Khách Ân','Khách Bình'];
 for(const [index,name]of names.entries()){
  if(index){await page.getByRole('button',{name:'Đơn mới',exact:true}).click();await expect(page.getByLabel('Mã đơn hàng',{exact:true})).toHaveValue('');}
  await page.getByLabel('Mã đơn hàng',{exact:true}).fill(`CUSTOMER-${index}`);
  await page.getByLabel('Tên khách hàng',{exact:true}).fill(name);
  await page.getByLabel('Số điện thoại',{exact:true}).fill('0');
  await page.getByLabel('Địa chỉ giao hàng',{exact:true}).fill(`Địa chỉ ${name}`);
  await page.getByRole('button',{name:'Thêm IP15-TR',exact:true}).click();
  await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu');
  await expect(page.getByRole('button',{name:'Lưu bản nháp',exact:true})).toBeEnabled();
  // Editing a saved draft keeps its own customer and does not create duplicates.
  if(!index){await page.getByLabel('Ghi chú đơn hàng').fill('Lưu lại');await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu');await expect(page.getByRole('button',{name:'Lưu bản nháp',exact:true})).toBeEnabled();}
 }
 await page.getByRole('button',{name:'Khách hàng',exact:true}).click();
 for(const name of names)await expect(page.getByRole('cell',{name,exact:true})).toHaveCount(1);
 await page.reload();
 if(await page.getByRole('button',{name:/Chủ cửa hàng/}).count())await page.getByRole('button',{name:/Chủ cửa hàng/}).click();
 await page.getByRole('button',{name:'Khách hàng',exact:true}).click();
 for(const name of names)await expect(page.getByRole('cell',{name,exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('button',{name:/Nguyễn An/}).click();await page.getByRole('button',{name:'Khách hàng',exact:true}).click();
 for(const name of names)await expect(page.getByRole('cell',{name,exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Đơn nháp',exact:true}).click();
 for(const [index,name]of names.entries())await expect(page.locator('tbody tr').filter({hasText:`CUSTOMER-${index}`})).toContainText(name);
});
