const { _electron: electron } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const packaged = process.argv.includes('--packaged');
  const production = process.argv.includes('--production');
  const userDataDir = path.resolve('.local', `electron-test-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const executablePath = packaged
    ? path.resolve('out/Oufeidun-win32-x64/Oufeidun.exe')
    : require('electron');
  const env = { ...process.env, APP_TEST_DATA: userDataDir };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    executablePath,
    args: packaged ? [] : ['.'],
    env,
    timeout: 60000,
  });

  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    if (packaged || production) {
      await page.locator('input[name="username"]').waitFor({ timeout: 60000 });
      await page.locator('input[name="password"]').waitFor();
      await page.getByRole('button', { name: /Đăng nhập/ }).waitFor();
      await page.evaluate(() => localStorage.setItem('app-ban-hang-auth', 'old-session'));
      await page.reload();
      await page.locator('input[name="username"]').waitFor({ timeout: 60000 });
      const oldSession = await page.evaluate(() => localStorage.getItem('app-ban-hang-auth'));
      if (oldSession !== null) throw new Error('The previous authentication session was not cleared.');
      if (packaged) await page.screenshot({ path: '.local/electron-packaged-smoke.png' });
      console.log(`${packaged ? 'Packaged' : 'Production'} Electron smoke passed: production login screen is ready.`);
    } else {
      await page.getByRole('button', { name: /Nguyễn An/ }).click();
      await page.getByRole('heading', { name: 'Bán hàng', exact: true }).waitFor({ timeout: 60000 });
      await page.getByRole('button', { name: 'Chọn IP15-TR', exact: true }).click();
      await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Đã lưu' }).waitFor();
      await page.screenshot({ path: '.local/electron-smoke.png' });
      console.log('Electron smoke passed: secure custom protocol, demo database, draft persisted.');
    }

    if (errors.length) throw new Error(errors.join('\n'));
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
