const fs = require('node:fs');
const path = require('node:path');
const { _electron: electron } = require('playwright');

async function main() {
  const basic = process.argv.includes('--basic');
  let password = process.env.OUFEIDUN_TEST_ADMIN_PASSWORD;
  const serverEnvFlag = process.argv.indexOf('--server-env');
  const serverEnvPath =
    process.env.OUFEIDUN_TEST_SERVER_ENV ||
    (serverEnvFlag >= 0 ? process.argv[serverEnvFlag + 1] : undefined);
  if (!password && serverEnvPath && fs.existsSync(serverEnvPath)) {
    const passwordLine = fs
      .readFileSync(serverEnvPath, 'utf8')
      .split(/\r?\n/)
      .find((line) => line.startsWith('ADMIN_PASSWORD='));
    password = passwordLine
      ?.slice(passwordLine.indexOf('=') + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
  if (!password) throw new Error('Thiếu OUFEIDUN_TEST_ADMIN_PASSWORD.');
  const executablePath = path.resolve(__dirname, '../out/Oufeidun-win32-x64/Oufeidun.exe');
  const userData = path.resolve(__dirname, '../.local/packaged-local-smoke');
  fs.rmSync(userData, { recursive: true, force: true });
  const env = { ...process.env, APP_TEST_DATA: userData };
  delete env.ELECTRON_RUN_AS_NODE;
  const desktop = await electron.launch({ executablePath, env, timeout: 60000 });
  try {
    const window = await desktop.firstWindow();
    await window.locator('input[name="username"]').fill('admin');
    await window.locator('input[name="password"]').fill(password);
    await window.getByRole('button', { name: 'Đăng nhập' }).click();
    try {
      await window.getByRole('heading', { name: 'Bán hàng' }).waitFor({ timeout: 20000 });
    } catch (error) {
      const alert = await window.getByRole('alert').textContent().catch(() => '');
      if (alert) console.error(`Login alert: ${alert.trim()}`);
      throw error;
    }
    const productCards = await window.locator('.product-card').count();
    if ((!basic && productCards !== 8) || (basic && productCards < 1)) {
      throw new Error(`Sai số lượng sản phẩm sau migration: mong đợi 8, nhận ${productCards}.`);
    }
    await window.locator('.product-art img').first().waitFor({ state: 'visible', timeout: 20000 });
    const loadedImages = await window.locator('.product-art img').evaluateAll((images) =>
      images.filter((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0).length,
    );
    if (!basic && loadedImages !== 2) {
      throw new Error(`Sai số ảnh sản phẩm tải được: mong đợi 2, nhận ${loadedImages}.`);
    }
    const orderCode = window.getByLabel('Mã đơn hàng', { exact: true });
    await orderCode.waitFor({ state: 'visible' });
    if ((await orderCode.getAttribute('required')) === null) throw new Error('Mã đơn hàng chưa được đặt là bắt buộc.');
    await window.getByRole('button', { name: 'Tải ảnh xác nhận', exact: true }).waitFor({ state: 'visible' });
    await window.getByRole('button', { name: 'Mã dùng chung', exact: true }).click();
    await window.getByLabel('Tra cứu mã kính dùng chung').fill('sa');
    await window.getByRole('button', { name: 'Tra cứu', exact: true }).click();
    const firstLookupResult = window.locator('.lookup-results article').first();
    await firstLookupResult.waitFor({ state: 'visible', timeout: 30000 });
    const lookupImages = firstLookupResult.locator('.lookup-image-button img');
    if (await lookupImages.count() !== 2) throw new Error(`Mã dùng chung phải hiển thị 2 ảnh, nhận ${await lookupImages.count()}.`);
    for (let index = 0; index < 2; index += 1) {
      const lookupImage = lookupImages.nth(index);
      await lookupImage.waitFor({ state: 'visible', timeout: 30000 });
      await window.waitForFunction(
        (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
        await lookupImage.elementHandle(),
        { timeout: 30000 },
      );
    }
    const lookupSku = (await firstLookupResult.locator('b').first().textContent())?.trim();
    if (!lookupSku?.startsWith('GNS-')) throw new Error(`Sai nguồn mã dùng chung: ${lookupSku || 'rỗng'}.`);
    console.log(
      `Packaged local smoke đạt: nghiệp vụ local có ${productCards} sản phẩm/${loadedImages} ảnh; mã dùng chung Supabase trả ${lookupSku} và đủ 2 ảnh hợp lệ.`,
    );
    const logout = window.getByText('Đăng xuất', { exact: true });
    if (await logout.count()) await logout.click();
  } finally {
    await desktop.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
