import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

for(const staff of [false,true])test(`stock adjustment with reason persists and exports, role=${staff?'staff':'Admin'}`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:staff?/Nguyễn An/:/Chủ cửa hàng/}).click();
 await page.getByRole('button',{name:'Kho hàng',exact:true}).click();
 const stock=()=>page.locator('tbody tr').filter({has:page.getByRole('button',{name:'Sửa IP15-TR',exact:true})});
 await page.getByRole('button',{name:'Điều chỉnh tồn IP15-TR',exact:true}).click();let dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Cách điều chỉnh',{exact:true})).toHaveValue('decrease');
 await dialog.getByLabel('Số lượng giảm',{exact:true}).fill('3');
 await expect(dialog.locator('.stock-adjustment-summary')).toContainText('45 tấm');
 await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(dialog).toBeVisible();await expect(stock()).toContainText('48 tấm');
 const reason=`Kiểm kê thiếu 3 tấm - ${staff?'staff':'Admin'}`;
 await dialog.getByLabel('Lý do / ghi chú',{exact:true}).fill(reason);
 await page.screenshot({path:`test-results/stock-adjustment-${staff?'staff':'admin'}.png`});
 await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã cập nhật kho');await expect(stock()).toContainText('45 tấm');
 await page.getByRole('button',{name:'Lịch sử IP15-TR',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog).toContainText(reason);await expect(dialog).toContainText('-3');await expect(dialog).toContainText('Người thực hiện:');await dialog.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.getByRole('button',{name:'Điều chỉnh tồn',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Mã sản phẩm cần điều chỉnh',{exact:true}).selectOption({label:'IP15-TR · Tồn: 45 tấm'});
 await dialog.getByLabel('Cách điều chỉnh',{exact:true}).selectOption('increase');await dialog.getByLabel('Số lượng tăng',{exact:true}).fill('2');await dialog.getByLabel('Lý do / ghi chú',{exact:true}).fill('Tìm lại 2 tấm');await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(stock()).toContainText('47 tấm');
 await page.getByRole('button',{name:'Điều chỉnh tồn IP15-TR',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Cách điều chỉnh',{exact:true}).selectOption('count');await dialog.getByLabel('Tồn thực tế sau kiểm kê',{exact:true}).fill('0');await dialog.getByLabel('Lý do / ghi chú',{exact:true}).fill('Đối chiếu hết tồn');await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(stock()).toContainText('0 tấm');
 await page.reload();await page.getByRole('button',{name:staff?/Nguyễn An/:/Chủ cửa hàng/}).click();await page.getByRole('button',{name:'Kho hàng',exact:true}).click();await expect(stock()).toContainText('0 tấm');
 if(staff){await expect(page.getByRole('button',{name:'Nhập hàng',exact:true})).toHaveCount(0);await expect(page.getByRole('columnheader',{name:'Giá vốn',exact:true})).toHaveCount(0);}
 await page.getByRole('button',{name:'Lịch sử thao tác',exact:true}).click();await expect(page.locator('tbody')).toContainText(reason);await expect(page.locator('tbody')).toContainText('Điều chỉnh tồn');
 await page.getByRole('button',{name:'Báo cáo',exact:true}).click();const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Tải báo cáo Excel',exact:true}).click();const book=new ExcelJS.Workbook();await book.xlsx.readFile((await(await dl).path())!);
 const moves:any[]=[];book.getWorksheet('Chi tiết kho')!.eachRow(r=>{if(r.getCell(2).text==='IP15-TR'&&r.getCell(8).text===reason)moves.push([r.getCell(4).value,r.getCell(5).value]);});expect(moves).toEqual([[-3,45]]);
 if(staff)expect(JSON.stringify(book.worksheets.map(s=>s.getSheetValues()))).not.toMatch(/Giá vốn|Tổng vốn|lợi nhuận/);
});
