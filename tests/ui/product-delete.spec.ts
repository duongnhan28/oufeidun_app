import { test, expect } from '@playwright/test';

test('admin deletes an empty glass SKU and receives guidance for remaining stock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Chủ cửa hàng/ }).click();
  await page.getByRole('button', { name: 'Kho kính', exact: true }).click();

  await page.getByRole('button', { name: 'Thêm mã kính', exact: true }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Mã kính', { exact: true }).fill('TEST-XOA');
  await createDialog.getByLabel('Tên sản phẩm', { exact: true }).fill('Kính kiểm thử xóa');
  await createDialog.getByLabel('Hãng điện thoại', { exact: true }).fill('Khác');
  await createDialog.getByLabel('Giá bán (đ)', { exact: true }).fill('10000');
  await createDialog.getByLabel('Giá vốn cố định (đ)', { exact: true }).fill('5000');
  await createDialog.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu sản phẩm');

  await page.getByRole('button', { name: 'Xóa TEST-XOA', exact: true }).click();
  const deleteDialog = page.getByRole('dialog');
  await expect(deleteDialog).toContainText('lịch sử đã phát sinh vẫn được giữ');
  await deleteDialog.getByRole('button', { name: 'Xóa mã kính', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã xóa mã kính TEST-XOA');
  await expect(page.getByRole('button', { name: 'Xóa TEST-XOA', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Xóa IP15-TR', exact: true }).click();
  const stockedDialog = page.getByRole('dialog');
  await expect(stockedDialog).toContainText('điều chỉnh tồn kho về 0');
  await expect(stockedDialog.getByRole('button', { name: 'Xóa mã kính', exact: true })).toHaveCount(0);
});
