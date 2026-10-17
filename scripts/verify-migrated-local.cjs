const assert = require('node:assert/strict');

const base = process.env.OUFEIDUN_VERIFY_BASE || 'http://127.0.0.1:8787';
const password = process.env.OUFEIDUN_TEST_ADMIN_PASSWORD;

async function json(response, label) {
  const body = await response.json();
  assert.equal(response.status, 200, `${label}: HTTP ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  assert(password, 'Thiếu OUFEIDUN_TEST_ADMIN_PASSWORD.');
  const health = await json(await fetch(`${base}/health`), 'health');
  assert.equal(health.ok, true);

  const signed = await json(await fetch(`${base}/api/app/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password, device_id: `migration-verify-${crypto.randomUUID()}` }),
  }), 'login');
  const headers = { Authorization: `Bearer ${signed.access_token}` };
  try {
    const workspace = await json(await fetch(`${base}/api/app/v1/workspace`, { headers }), 'workspace');
    assert.equal(workspace.products.length, 8, 'Sai số sản phẩm');
    assert.equal(workspace.orders.length, 17, 'Sai số đơn hàng');
    assert.equal(workspace.customers.length, 3, 'Sai số khách hàng');
    // Nguồn có 4 tài khoản; một nhân viên đã bị xóa mềm nên workspace chỉ trả 3 tài khoản còn hiệu lực.
    assert.equal(workspace.users.length, 3, 'Sai số tài khoản còn hiệu lực');
    assert.equal(workspace.products.reduce((sum, item) => sum + item.on_hand, 0), 5185, 'Sai tổng tồn kho');

    const productsWithImages = workspace.products.filter((item) => item.image_path);
    assert.equal(productsWithImages.length, 2, 'Sai số liên kết ảnh');
    for (const product of productsWithImages) {
      const response = await fetch(`${base}/api/images/${encodeURIComponent(product.id)}`);
      assert.equal(response.status, 200, `Không tải được ảnh ${product.sku}`);
      assert.equal(response.headers.get('content-type'), 'image/jpeg', `Sai MIME ảnh ${product.sku}`);
      assert((await response.arrayBuffer()).byteLength > 100_000, `Ảnh ${product.sku} quá nhỏ`);
    }

    const lookup = await json(await fetch(`${base}/api/glass-lookup?q=IP`), 'glass lookup');
    assert(lookup.items.length >= 2, 'Tra cứu IP không có đủ kết quả');
    assert(lookup.items.some((item) => item.compatibleModels.length >= 2), 'Thiếu dữ liệu mã dùng chung');

    const report = await json(await fetch(`${base}/api/app/v1/reports`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: '2026-01-01', to: '2026-12-31', brand: 'all' }),
    }), 'report');
    assert.equal(report.stock, 5185, 'Sai tồn kho trên báo cáo');
    assert.equal(report.inventory.length, 8, 'Sai số dòng nhập-xuất-tồn');
    assert(report.order_count > 0, 'Báo cáo không có đơn đã xác nhận');

    console.log(JSON.stringify({
      products: workspace.products.length,
      images: productsWithImages.length,
      orders: workspace.orders.length,
      customers: workspace.customers.length,
      users: workspace.users.length,
      stock: report.stock,
      confirmed_orders_in_2026: report.order_count,
      lookup_items: lookup.items.length,
    }, null, 2));
  } finally {
    await fetch(`${base}/api/app/v1/auth/logout`, { method: 'POST', headers });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
