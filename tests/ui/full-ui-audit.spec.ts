import { expect, test, type Page } from '@playwright/test';

async function assertPageUi(page: Page, title: string) {
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.waitForTimeout(120);
  const audit = await page.evaluate(() => {
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const unnamedButtons = [...document.querySelectorAll('button')]
      .filter(visible)
      .filter((button) => !button.getAttribute('aria-label') && !button.getAttribute('title') && !button.textContent?.trim()).length;
    const unnamedFields = [...document.querySelectorAll('input,select,textarea')]
      .filter(visible)
      .filter((field) => {
        if (field.getAttribute('aria-label') || field.getAttribute('title')) return false;
        if (field.closest('label')) return false;
        const id = field.getAttribute('id');
        return !id || !document.querySelector(`label[for="${CSS.escape(id)}"]`);
      }).length;
    const imagesWithoutAlt = [...document.querySelectorAll('img')]
      .filter(visible)
      .filter((image) => !image.hasAttribute('alt')).length;
    return {
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      unnamedButtons,
      unnamedFields,
      imagesWithoutAlt,
      h1Count: document.querySelectorAll('main h1').length,
      mainText: document.querySelector('main')?.textContent?.trim().length || 0,
    };
  });
  expect(audit, `${title} must render without global UI defects`).toEqual({
    documentOverflow: false,
    unnamedButtons: 0,
    unnamedFields: 0,
    imagesWithoutAlt: 0,
    h1Count: 1,
    mainText: expect.any(Number),
  });
  expect(audit.mainText).toBeGreaterThan(20);
}

test('all admin and staff pages render without crashes, overflow or unnamed controls', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) runtimeErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: /Chủ cửa hàng/ }).click();
  await expect(page.getByRole('heading', { name: 'Bán hàng', exact: true })).toBeVisible({ timeout: 45_000 });

  const adminPages = [
    ['Bán hàng', 'Bán hàng'],
    ['Mã dùng chung', 'Mã dùng chung'],
    ['Đơn hàng', 'Đơn hàng'],
    ['Khách hàng', 'Khách hàng'],
    ['Kho hàng', 'Kho hàng'],
    ['Báo cáo', 'Báo cáo'],
    ['Nhân viên', 'Nhân viên'],
    ['Lịch sử thao tác', 'Lịch sử thao tác'],
  ] as const;
  for (const [navigation, heading] of adminPages) {
    await page.getByRole('button', { name: navigation, exact: true }).click();
    await assertPageUi(page, heading);
  }

  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.getByRole('button', { name: /Nguyễn An/ }).click();
  const staffPages = [
    ['Bán hàng', 'Bán hàng'],
    ['Mã dùng chung', 'Mã dùng chung'],
    ['Đơn nháp', 'Đơn nháp'],
    ['Đơn hàng', 'Đơn hàng'],
    ['Kho hàng', 'Kho hàng'],
    ['Khách hàng','Khách hàng'],
    ['Báo cáo','Báo cáo'],
    ['Lịch sử thao tác','Lịch sử thao tác'],
  ] as const;
  for (const [navigation, heading] of staffPages) {
    await page.getByRole('button', { name: navigation, exact: true }).click();
    await assertPageUi(page, heading);
    await expect(page.getByText('Giá vốn', { exact: true })).toHaveCount(0);
  }
  expect(runtimeErrors).toEqual([]);
});

test('staff can change order display information and actual sale price', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Nguyễn An/ }).click();
  await page.getByRole('button', { name: 'Chọn IP15-TR', exact: true }).click();
  await page.getByRole('button', { name: 'Tùy chỉnh IP15-TR', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Tên hiển thị')).toHaveCount(0);
  const salePrice = dialog.getByLabel('Giá bán thực tế (đ)');
  await expect(salePrice).toBeVisible();
  await expect(salePrice).toBeEditable();
  await expect(dialog.getByLabel('Phạm vi áp dụng giá').locator('option[value="glass_type"]')).toContainText('Toàn bộ Full viền trong đơn');
  await expect(dialog.getByLabel('Phạm vi áp dụng giá').locator('option[value^="catalog_"]')).toHaveCount(2);
});

test('sale actions remain visible at the minimum desktop window size', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: /Nguyễn An/ }).click();
  await page.getByLabel('Tên khách hàng').fill('Khách kiểm tra nút bán');
  await page.getByLabel('Số điện thoại').fill('0900000000');
  await page.getByLabel('Địa chỉ giao hàng').fill('12 Nguyễn Huệ');
  await page.getByRole('button', { name: 'Chọn IP15-TR', exact: true }).click();
  const saveDraft = page.getByRole('button', { name: 'Lưu bản nháp', exact: true });
  const confirmSale = page.getByRole('button', { name: 'Xác nhận bán', exact: true });
  await expect(saveDraft).toBeVisible();
  await expect(confirmSale).toBeVisible();
  for (const button of [saveDraft, confirmSale]) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(700);
  }
  const assertSalesLayoutFits = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    const layout = await page.evaluate(() => {
      const viewportContains = (element: Element) => {
        const box = element.getBoundingClientRect();
        return box.left >= -0.5 && box.right <= window.innerWidth + 0.5;
      };
      const cart = document.querySelector('.cart');
      const sidebar = document.querySelector('.sidebar');
      const main = document.querySelector('main');
      const actionButtons = [...document.querySelectorAll('.cart-actions button')];
      const cards = [...document.querySelectorAll('.product-grid .product-card')].slice(0, 4);
      const controls = document.querySelector('.catalog-controls');
      const search = document.querySelector('.catalog-controls .search');
      const selects = [...document.querySelectorAll('.catalog-controls .search-tools select')];
      return {
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        scrollX: window.scrollX,
        shellFits: !!sidebar && !!main && viewportContains(sidebar) && viewportContains(main),
        cartFits: !!cart && viewportContains(cart),
        actionsFit: actionButtons.length === 4 && actionButtons.every((button) => {
          const element = button as HTMLElement;
          return viewportContains(element) && element.scrollWidth <= element.clientWidth + 1;
        }),
        firstRowCardCount: cards.filter((card) => Math.abs(card.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) <= 3).length,
        cartWidth: cart?.getBoundingClientRect().width || 0,
        searchWidth: search?.getBoundingClientRect().width || 0,
        selectWidths: selects.map((select) => select.getBoundingClientRect().width),
        rightAlignmentDelta: controls && cards[3] ? Math.abs(controls.getBoundingClientRect().right - cards[3].getBoundingClientRect().right) : 0,
      };
    });
    expect(layout, `sales layout must fit ${width}x${height}`).toEqual({
      documentOverflow: false,
      scrollX: 0,
      shellFits: true,
      cartFits: true,
      actionsFit: true,
      firstRowCardCount: width >= 1600 ? 4 : 2,
      cartWidth: expect.any(Number),
      searchWidth: expect.any(Number),
      selectWidths: expect.any(Array),
      rightAlignmentDelta: expect.any(Number),
    });
    expect(layout.cartWidth).toBeGreaterThanOrEqual(width >= 1600 ? 420 : 300);
    if (width >= 1600) {
      expect(layout.searchWidth).toBeGreaterThan(300);
      expect(layout.selectWidths).toEqual([180]);
      await expect(page.getByLabel('Lọc hãng điện thoại')).toHaveCount(0);
      expect(layout.rightAlignmentDelta).toBeLessThanOrEqual(20);
    }
  };
  await assertSalesLayoutFits(1000, 700);
  await assertSalesLayoutFits(1667, 1034);
});

test('sale product cards use a readable type scale', async ({ page }) => {
  await page.setViewportSize({ width: 1667, height: 1034 });
  await page.goto('/');
  await page.locator('.demo-user').nth(1).click();
  const card = page.locator('.product-card').first();
  await expect(card).toBeVisible({timeout:45000});
  const typeScale = await card.evaluate((element) => {
    const size = (selector: string) => {
      const target = element.querySelector(selector);
      return target ? Number.parseFloat(getComputedStyle(target).fontSize) : 0;
    };
    return {
      sku: size('.product-info > strong'),
      compatibility: size('.compatibility-list, .compatibility-match'),
      stock: size('.product-info > .badge'),
      price: size('.product-price b'),
      priceLabel: size('.product-price small'),
    };
  });
  expect(typeScale.sku).toBeGreaterThanOrEqual(16);
  await expect(card.locator('.product-info > p')).toHaveCount(0);
  expect(typeScale.compatibility).toBeGreaterThanOrEqual(13);
  expect(typeScale.stock).toBeGreaterThanOrEqual(13);
  expect(typeScale.price).toBeGreaterThanOrEqual(22);
  expect(typeScale.priceLabel).toBeGreaterThanOrEqual(13);
  await page.screenshot({ path: 'test-results/product-card-readability.png', fullPage: true });
});
