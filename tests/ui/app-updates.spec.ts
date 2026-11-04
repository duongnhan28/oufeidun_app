import { test, expect } from '@playwright/test';

test('client update UI checks, downloads on click and never auto-installs', async ({ page }) => {
  await page.addInitScript(() => {
    let state = { currentVersion: '0.1.1', phase: 'idle', version: undefined as string | undefined, notes: undefined as string | undefined, size: undefined as number | undefined };
    Object.assign(window, { updateDownloadCalls: 0, updateShowCalls: 0, oufeidun: {
      updateStatus: async () => ({ ...state }),
      checkUpdate: async () => (state = { currentVersion: '0.1.1', phase: 'available', version: '0.1.2', notes: 'Bản cập nhật kiểm thử', size: 1048576 }),
      downloadUpdate: async () => { (window as unknown as { updateDownloadCalls: number }).updateDownloadCalls++; state.phase = 'downloaded'; return { ...state }; },
      showUpdateFile: async () => { (window as unknown as { updateShowCalls: number }).updateShowCalls++; return true; },
    } });
  });
  await page.goto('/');
  const panel = page.getByRole('complementary', { name: 'Cập nhật ứng dụng' });
  await panel.getByRole('button', { name: 'Cập nhật ứng dụng' }).click();
  await panel.getByRole('button', { name: 'Kiểm tra phiên bản' }).click();
  await expect(panel.getByText('Bản cập nhật kiểm thử', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { updateDownloadCalls: number }).updateDownloadCalls)).toBe(0);
  await panel.getByRole('button', { name: 'Tải bản cập nhật', exact: true }).click();
  await expect(panel.getByText(/File đã tải và xác minh/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { updateShowCalls: number }).updateShowCalls)).toBe(0);
  await panel.getByRole('button', { name: 'Mở thư mục tải' }).click();
  expect(await page.evaluate(() => (window as unknown as { updateShowCalls: number }).updateShowCalls)).toBe(1);
  await expect(panel.getByRole('button', { name: /Cài đặt/ })).toHaveCount(0);
});
