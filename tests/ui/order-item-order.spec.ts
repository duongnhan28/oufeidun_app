import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('sale groups pair gifts, orphan gifts follow and samples stay last across cart, draft, PNG, Excel and PDF',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
 await page.getByLabel('Mã đơn hàng',{exact:true}).fill('SORTED-LINES');await page.getByLabel('Tên khách hàng',{exact:true}).fill('Khách thứ tự');await page.getByLabel('Số điện thoại',{exact:true}).fill('0901234567');
 const cart=page.locator('.cart-item');
 const line=(sku:string,kind:string)=>cart.filter({has:page.locator('.line-name b').filter({hasText:new RegExp(`^${sku}$`)})}).filter({hasText:kind});
 const cartOrder=()=>cart.evaluateAll(rows=>rows.map(row=>`${row.querySelector('.line-name b')!.textContent}:${row.textContent!.includes('Hàng mẫu')&&row.querySelector('.line-tags')!.textContent!.includes('Hàng mẫu')?'sample':row.querySelector('.line-tags')!.textContent!.includes('Hàng tặng')?'gift':'sale'}`));
 const expected=['IP15-TR:sale','IP15-TR:gift','IP14PM:sale','IP14PM:gift','IP16P-TR:gift','IP15-TR:sample','IP14PM:sample'];
 // Add in deliberately scattered order, including an orphan gift and samples of sold SKUs.
 await page.getByRole('button',{name:'Thêm IP15-TR',exact:true}).click();await cart.first().getByRole('button',{name:'Thêm hàng mẫu IP15-TR',exact:true}).click();
 await page.getByRole('button',{name:'Thêm IP16P-TR',exact:true}).click();await page.getByRole('button',{name:'Tùy chỉnh IP16P-TR',exact:true}).click();await page.getByRole('dialog').getByLabel('Loại hàng').selectOption('gift');await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await page.getByRole('button',{name:'Thêm IP14PM',exact:true}).click();await page.getByRole('button',{name:'Thêm hàng tặng IP14PM',exact:true}).click();await line('IP14PM','').first().getByRole('button',{name:'Thêm hàng mẫu IP14PM',exact:true}).click();await line('IP15-TR','').first().getByRole('button',{name:'Thêm hàng tặng IP15-TR',exact:true}).click();
 await expect.poll(cartOrder).toEqual(expected);
 await line('IP14PM','').first().getByRole('button',{name:'Bỏ IP14PM',exact:true}).click();await expect.poll(cartOrder).toEqual(['IP15-TR:sale','IP15-TR:gift','IP16P-TR:gift','IP14PM:gift','IP15-TR:sample','IP14PM:sample']);
 await page.getByRole('button',{name:'Thêm IP14PM',exact:true}).click();await expect.poll(cartOrder).toEqual(expected);
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu');
 await page.reload();await page.getByRole('button',{name:/Chủ cửa hàng/}).click();await expect(page.locator('.product-card').first()).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Đơn hàng',exact:true}).click();await page.getByRole('button',{name:'Chi tiết',exact:true}).click();
 const detailOrder=()=>page.locator('.order-detail-product').evaluateAll(rows=>rows.map(row=>`${row.querySelector('b')!.textContent}:${row.textContent!.includes('Hàng mẫu')?'sample':row.textContent!.includes('Hàng tặng')?'gift':'sale'}`));
 await expect.poll(detailOrder).toEqual(expected);
 await page.getByRole('button',{name:'In / lưu PDF',exact:true}).click();
 expect(await page.locator('.bill-table tbody tr').evaluateAll(rows=>rows.map(row=>`${row.querySelector('b')!.textContent}:${row.textContent!.includes('Hàng mẫu')?'sample':row.textContent!.includes('Hàng tặng')?'gift':'sale'}`))).toEqual(expected);
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Chi tiết',exact:true}).click();await page.getByRole('button',{name:'Mở bản nháp',exact:true}).click();await expect.poll(cartOrder).toEqual(expected);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Tải Excel',exact:true}).click();const book=new ExcelJS.Workbook();await book.xlsx.readFile((await(await download).path())!);
 const descriptions=book.worksheets[0].getSheetValues().slice(7,14).map((row:any)=>row[2]);
 expect(descriptions.map(text=>`${text.split('\n')[0]}:${text.includes('Hàng mẫu')?'sample':text.includes('Hàng tặng')?'gift':'sale'}`)).toEqual(expected);
 await page.evaluate(()=>{const original=CanvasRenderingContext2D.prototype.fillText;(window as any).drawn=[];CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){(window as any).drawn.push(text);if(maxWidth===undefined)original.call(this,text,x,y);else original.call(this,text,x,y,maxWidth);};});
 const png=page.waitForEvent('download');await page.getByRole('button',{name:'Tải ảnh xác nhận',exact:true}).click();await(await png).saveAs('test-results/sorted-lines-confirmation.png');
 const drawn:string[]=await page.evaluate(()=>(window as any).drawn);const lines=drawn.map((text,index)=>({text,index})).filter(row=>['IP14PM','IP15-TR','IP16P-TR'].includes(row.text));
 expect(lines.map((row,index)=>`${row.text}:${drawn.slice(row.index+1,lines[index+1]?.index).some(text=>text.includes('Hàng mẫu'))?'sample':drawn.slice(row.index+1,lines[index+1]?.index).some(text=>text.includes('Hàng tặng'))?'gift':'sale'}`)).toEqual(expected);
 await expect(page.locator('.cart-summary .total')).toContainText('55.000đ');
 await page.getByRole('button',{name:'Xác nhận bán',exact:true}).click();await page.getByRole('button',{name:'Xác nhận và trừ kho',exact:true}).click();await expect(page.getByRole('dialog',{name:'Xác nhận bán hàng'})).toHaveCount(0);
 await expect(page.locator('.product-card').filter({hasText:'IP14PM'})).toContainText('Tồn: 33');await expect(page.locator('.product-card').filter({hasText:'IP15-TR'})).toContainText('Tồn: 45');await expect(page.locator('.product-card').filter({hasText:'IP16P-TR'})).toContainText('Tồn: 31');
 await page.getByRole('button',{name:'Đơn hàng',exact:true}).click();await page.getByRole('button',{name:'Chi tiết',exact:true}).click();await expect.poll(detailOrder).toEqual(expected);await page.screenshot({path:'test-results/sorted-lines-detail.png'});
 // Exporting the saved sale uses snapshots rather than the active cart.
 await page.evaluate(()=>{(window as any).drawn=[];});
 const soldPng=page.waitForEvent('download');await page.getByRole('button',{name:'Tải ảnh PNG',exact:true}).click();await(await soldPng).saveAs('test-results/grouped-gifts-sold-confirmation.png');
 const soldDrawn:string[]=await page.evaluate(()=>(window as any).drawn);const soldLines=soldDrawn.map((text,index)=>({text,index})).filter(row=>['IP14PM','IP15-TR','IP16P-TR'].includes(row.text));
 expect(soldLines.map((row,index)=>`${row.text}:${soldDrawn.slice(row.index+1,soldLines[index+1]?.index).some(text=>text.includes('Hàng mẫu'))?'sample':soldDrawn.slice(row.index+1,soldLines[index+1]?.index).some(text=>text.includes('Hàng tặng'))?'gift':'sale'}`)).toEqual(expected);
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 const soldExcel=page.waitForEvent('download');await page.getByRole('button',{name:'Tải Excel SORTED-LINES',exact:true}).click();
 const soldBook=new ExcelJS.Workbook();await soldBook.xlsx.readFile((await(await soldExcel).path())!);
 expect(soldBook.worksheets[0].getSheetValues().slice(7,14).map((row:any)=>{const text=String(row[2]);return `${text.split('\n')[0]}:${text.includes('Hàng mẫu')?'sample':text.includes('Hàng tặng')?'gift':'sale'}`;})).toEqual(expected);
});

