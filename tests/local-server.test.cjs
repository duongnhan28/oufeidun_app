const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.MYSQL_USER = 'test';
process.env.MYSQL_PASSWORD = 'test';
process.env.OUFEIDUN_DATA_DIR = path.join(__dirname, '..', '.local', 'server-unit-data');
const { passwordHash, passwordMatches, canonical } = require('../server/src/core.cjs');
const { normalize } = require('../server/src/lookup.cjs');
const { sniff, resolveImage } = require('../server/src/images.cjs');

test('password hash dùng salt và xác minh đúng mật khẩu', () => {
  const first = passwordHash('HuynhHuynh111');
  const second = passwordHash('HuynhHuynh111');
  assert.notEqual(first, second);
  assert.equal(passwordMatches('HuynhHuynh111', first), true);
  assert.equal(passwordMatches('SaiMatKhau111', first), false);
});
test('canonical giữ idempotency ổn định khi thứ tự key khác nhau', () => {
  assert.equal(canonical({b:2,a:{d:4,c:3}}), canonical({a:{c:3,d:4},b:2}));
});
test('chuẩn hóa tìm mã dùng chung không phụ thuộc dấu và chữ hoa', () => {
  assert.equal(normalize('  Samsung Á 13 '), 'SAMSUNG A 13');
});
test('nhận diện chữ ký ảnh và từ chối file giả', () => {
  assert.equal(sniff(Buffer.from([0xff,0xd8,0xff,0x01])).mime, 'image/jpeg');
  assert.throws(() => sniff(Buffer.from('not-an-image')), /VALIDATION_ERROR/);
});
test('đường dẫn ảnh không thể thoát khỏi thư mục upload', () => {
  assert.throws(() => resolveImage('../server/.env.local'), /VALIDATION_ERROR/);
  assert.match(resolveImage('products/2026/09/550e8400-e29b-41d4-a716-446655440000.png'), /uploads[\\/]products/);
});
test('schema chứa các miền dữ liệu bắt buộc', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../server/mysql/001_schema.sql'), 'utf8');
  for (const table of ['app_users','products','customers','sales_orders','sales_order_items','sales_returns','sales_payments','inventory_movements','audit_logs','mutation_requests'])
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(sql, /CHECK \(on_hand>=0\)/);
});
