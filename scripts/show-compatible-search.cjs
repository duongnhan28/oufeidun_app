const { _electron: electron } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const wait = (page, milliseconds) => page.waitForTimeout(milliseconds);

(async () => {
  const userDataDir = path.resolve('.local', `visible-demo-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });
  const env = {
    ...process.env,
    APP_TEST_DATA: userDataDir,
    APP_TEST_VISIBLE: '1'
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    executablePath: require('electron'),
    args: ['.'],
    env,
    timeout: 60000
  });

  try {
    const page = await app.firstWindow();
    await page.bringToFront();
    await wait(page, 1800);

    await page.getByRole('button', { name: /Nguyễn An/ }).click();
    await page.getByRole('heading', { name: 'Bán hàng', exact: true }).waitFor({ timeout: 60000 });
    await wait(page, 1800);

    const search = page.getByLabel('Tìm mã kính hoặc dòng điện thoại');
    await search.fill('A13');
    const replacement = page.locator('.product-card').filter({ hasText: 'SAM-A12' });
    await replacement.waitFor();
    await replacement.locator('.compatibility-match').waitFor();
    await wait(page, 3000);

    await replacement.getByRole('button', { name: 'Chọn SAM-A12', exact: true }).click();
    await page.locator('.cart-item').filter({ hasText: 'SAM-A12' }).waitFor();
    await wait(page, 15000);
  } finally {
    app.process().kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
