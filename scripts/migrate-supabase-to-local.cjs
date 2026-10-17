const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { pool, config, passwordHash } = require('../server/src/core.cjs');
const { sniff } = require('../server/src/images.cjs');

const sourceTables = [
  'app_users', 'audit_logs', 'customers', 'glass_brands', 'inventory_balances',
  'inventory_document_items', 'inventory_documents', 'inventory_movements',
  'product_costs', 'products', 'sales_item_costs', 'sales_order_items',
  'sales_orders', 'sales_payments', 'sales_return_items', 'sales_returns',
];
const sampleSkus = new Set(['IP15-TR', 'IP15-CNT', 'SAM-A12', 'OP-A78']);

function parseEnv(file) {
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        let value = line.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        return [line.slice(0, index), value];
      }),
  );
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}
function mysqlDate(value) {
  if (!value) return null;
  const shifted = new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().replace('T', ' ').slice(0, 23);
}
function deterministicImagePath(buffer, extension) {
  const hex = sha256(buffer).slice(0, 32);
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  const now = new Date();
  return `products/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${uuid}.${extension}`;
}
function validate(data) {
  const ids = (table) => new Set(data[table].map((row) => String(row.id)));
  const users = ids('app_users'), products = ids('products'), customers = ids('customers');
  const orders = ids('sales_orders'), orderItems = ids('sales_order_items');
  const returns = ids('sales_returns'), returnItems = ids('sales_return_items');
  const documents = ids('inventory_documents'), documentItems = ids('inventory_document_items');
  const brands = ids('glass_brands');
  const unique = (values, label) => {
    const normalized = values.map((value) => String(value).toLowerCase());
    if (new Set(normalized).size !== normalized.length) throw new Error(`Nguồn bị trùng ${label}.`);
  };
  unique(data.products.map((row) => row.sku), 'SKU');
  unique(data.app_users.map((row) => row.login_name), 'tên đăng nhập');
  for (const row of data.products) if (row.glass_brand_id && !brands.has(String(row.glass_brand_id))) throw new Error(`FK hãng kính lỗi: ${row.id}`);
  for (const row of data.customers) if (!['retail', 'wholesale'].includes(row.customer_type)) throw new Error(`Loại khách sai: ${row.id}`);
  for (const row of data.sales_orders) {
    if (!users.has(String(row.created_by)) || (row.confirmed_by && !users.has(String(row.confirmed_by))) || (row.sales_user_id && !users.has(String(row.sales_user_id)))) throw new Error(`FK user đơn lỗi: ${row.id}`);
    if (row.customer_id && !customers.has(String(row.customer_id))) throw new Error(`FK khách đơn lỗi: ${row.id}`);
    if (row.exchange_return_id && !returns.has(String(row.exchange_return_id))) throw new Error(`FK đổi hàng lỗi: ${row.id}`);
  }
  for (const row of data.sales_order_items) if (!orders.has(String(row.order_id)) || !products.has(String(row.product_id))) throw new Error(`FK dòng đơn lỗi: ${row.id}`);
  for (const row of data.sales_returns) if (!orders.has(String(row.order_id)) || !users.has(String(row.created_by))) throw new Error(`FK trả hàng lỗi: ${row.id}`);
  for (const row of data.sales_return_items) if (!returns.has(String(row.return_id)) || !orderItems.has(String(row.order_item_id))) throw new Error(`FK dòng trả lỗi: ${row.id}`);
  for (const row of data.sales_payments) if (!orders.has(String(row.order_id)) || !users.has(String(row.created_by))) throw new Error(`FK thanh toán lỗi: ${row.id}`);
  for (const row of data.inventory_documents) if (!users.has(String(row.created_by))) throw new Error(`FK phiếu kho lỗi: ${row.id}`);
  for (const row of data.inventory_document_items) if (!documents.has(String(row.document_id)) || !products.has(String(row.product_id))) throw new Error(`FK dòng kho lỗi: ${row.id}`);
  for (const row of data.inventory_movements) {
    if (!products.has(String(row.product_id)) || !users.has(String(row.actor_id))) throw new Error(`FK biến động kho lỗi: ${row.id}`);
    if (row.inventory_document_item_id && !documentItems.has(String(row.inventory_document_item_id))) throw new Error(`FK chi tiết kho lỗi: ${row.id}`);
    if (row.sale_order_item_id && !orderItems.has(String(row.sale_order_item_id))) throw new Error(`FK dòng bán lỗi: ${row.id}`);
    if (row.return_item_id && !returnItems.has(String(row.return_item_id))) throw new Error(`FK dòng trả kho lỗi: ${row.id}`);
  }
  for (const row of data.audit_logs) if (!users.has(String(row.actor_id))) throw new Error(`FK lịch sử lỗi: ${row.id}`);
}
async function readSource() {
  const sourceEnvFile = process.env.OUFEIDUN_SUPABASE_ENV || 'E:/mhpGroup/.env.supabase.local';
  const env = parseEnv(sourceEnvFile);
  const connectionString = String(env.SUPABASE_MIGRATION_URL || '').replace(/[?&]sslmode=[^&]+/, '');
  const caFile = process.env.OUFEIDUN_SUPABASE_CA || path.resolve('.local/supabase-root-2021.crt');
  const ca = fs.readFileSync(caFile, 'utf8');
  const client = new Client({ connectionString, ssl: { ca, rejectUnauthorized: true } });
  await client.connect();
  const data = {};
  try {
    await client.query('begin transaction read only isolation level repeatable read');
    for (const table of sourceTables) {
      const rows = await client.query(`select * from app_ban_hang."${table}" order by 1`);
      data[table] = rows.rows;
    }
    const excluded = await client.query(`
      select
        (select count(*)::int from app_ban_hang.active_sessions) active_sessions,
        (select count(*)::int from app_ban_hang.mutation_requests) mutation_requests
    `);
    data._excluded = excluded.rows[0];
    const bucket = await client.query(`
      select id from storage.buckets
      where id in ('app-ban-hang-product-images','product-images')
      order by case when id='app-ban-hang-product-images' then 0 else 1 end
      limit 1
    `);
    data._storage_bucket = bucket.rows[0]?.id || null;
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  validate(data);
  return data;
}
async function downloadImages(data, snapshotDir) {
  const paths = [...new Set(data.products.map((row) => row.image_path).filter(Boolean))];
  if (!paths.length) return [];
  const frontend = parseEnv(path.resolve('.env.test-supabase.local'));
  const password = process.env.OUFEIDUN_SOURCE_ADMIN_PASSWORD;
  if (!password) throw new Error('Thiếu OUFEIDUN_SOURCE_ADMIN_PASSWORD để tải ảnh private.');
  const supabase = createClient(frontend.VITE_SUPABASE_URL, frontend.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: email, error: resolveError } = await supabase.rpc('app_ban_hang_resolve_login', { p_login_name: process.env.OUFEIDUN_SOURCE_ADMIN_LOGIN || 'admin' });
  if (resolveError || !email) throw new Error('Không tìm thấy tài khoản admin nguồn để tải ảnh.');
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: String(email), password });
  if (loginError) throw new Error('Không đăng nhập được Supabase nguồn để tải ảnh.');
  const { error: claimError } = await supabase.rpc('app_ban_hang_claim_session', { p_device_id: crypto.randomUUID() });
  if (claimError) throw new Error(`Không nhận được phiên Supabase để tải ảnh: ${claimError.message}`);
  const imageDir = path.join(snapshotDir, 'images');
  fs.mkdirSync(imageDir, { recursive: true });
  const result = [];
  try {
    for (const sourcePath of paths) {
      if (!data._storage_bucket) throw new Error('Không tìm thấy bucket ảnh nguồn.');
      const { data: blob, error } = await supabase.storage.from(data._storage_bucket).download(sourcePath);
      if (error || !blob) throw new Error(`Không tải được ảnh nguồn: ${sourcePath} (${error?.message || 'không có dữ liệu'})`);
      const buffer = Buffer.from(await blob.arrayBuffer());
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error(`Kích thước ảnh nguồn không hợp lệ: ${sourcePath}`);
      const type = sniff(buffer);
      const hash = sha256(buffer);
      const snapshotFile = `${hash}.${type.ext}`;
      fs.writeFileSync(path.join(imageDir, snapshotFile), buffer, { flag: 'wx' });
      result.push({ source_path: sourcePath, snapshot_file: `images/${snapshotFile}`, sha256: hash, bytes: buffer.length, mime: type.mime, extension: type.ext });
    }
  } finally {
    try { await supabase.rpc('app_ban_hang_release_session'); } catch {}
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
  }
  return result;
}
async function inspectLocal() {
  const [[counts]] = await pool.query(`
    select
      (select count(*) from products) products,
      (select count(*) from sales_orders) orders,
      (select count(*) from customers) customers,
      (select count(*) from inventory_movements) movements
  `);
  const [products] = await pool.query('select sku from products order by sku');
  return { counts, skus: products.map((row) => row.sku) };
}
async function insertRows(db, table, columns, rows, mapper) {
  if (!rows.length) return;
  const sql = `insert into ${table} (${columns.join(',')}) values (${columns.map(() => '?').join(',')})`;
  for (const row of rows) await db.execute(sql, mapper(row));
}
async function applyToLocal(data, images, snapshotDir) {
  const adminPassword = process.env.OUFEIDUN_LOCAL_ADMIN_PASSWORD;
  const staffPassword = process.env.OUFEIDUN_LOCAL_STAFF_PASSWORD;
  if (!adminPassword || !staffPassword) throw new Error('Thiếu mật khẩu khởi tạo local cho admin/staff.');
  const local = await inspectLocal();
  const onlySamples = local.skus.every((sku) => sampleSkus.has(sku));
  if ((Number(local.counts.orders) || Number(local.counts.customers) || !onlySamples) && !process.argv.includes('--replace-local')) {
    throw new Error('Local có dữ liệu ngoài sample. Chỉ thay thế khi truyền --replace-local sau khi đã backup.');
  }
  const imageMap = new Map();
  const createdFiles = [];
  for (const image of images) {
    const buffer = fs.readFileSync(path.join(snapshotDir, image.snapshot_file));
    const relative = deterministicImagePath(buffer, image.extension);
    const target = path.join(config.dataDir, 'uploads', ...relative.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) {
      if (sha256(fs.readFileSync(target)) !== image.sha256) throw new Error(`Ảnh local trùng đường dẫn nhưng sai checksum: ${relative}`);
    } else {
      fs.writeFileSync(target, buffer, { flag: 'wx' });
      createdFiles.push(target);
    }
    imageMap.set(image.source_path, relative);
  }
  const costByProduct = new Map(data.product_costs.map((row) => [String(row.product_id), String(row.fixed_cost)]));
  const balanceByProduct = new Map(data.inventory_balances.map((row) => [String(row.product_id), row]));
  const costByItem = new Map(data.sales_item_costs.map((row) => [String(row.order_item_id), String(row.unit_cost_snapshot)]));
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    await db.query('update sales_orders set exchange_return_id=null');
    for (const table of ['mutation_requests','audit_logs','inventory_movements','inventory_document_items','inventory_documents','sales_payments','sales_return_items','sales_returns','sales_order_items','sales_orders','customers','products','glass_brands','app_users']) await db.query(`delete from ${table}`);
    await insertRows(db, 'app_users', ['id','login_name','display_name','password_hash','role','active','created_at','deleted_at'], data.app_users, (row) => [row.id, row.login_name.toLowerCase(), row.display_name, passwordHash(row.role === 'admin' ? adminPassword : staffPassword), row.role, row.active, mysqlDate(row.created_at), mysqlDate(row.deleted_at)]);
    await insertRows(db, 'glass_brands', ['id','name','created_at'], data.glass_brands, (row) => [row.id, row.name, mysqlDate(row.created_at)]);
    await insertRows(db, 'products', ['id','sku','name','glass_type','models','brand','glass_brand_id','image_path','sale_price','wholesale_price','fixed_cost','on_hand','version','price_version','stock_version','active','created_at','deleted_at'], data.products, (row) => {
      const balance = balanceByProduct.get(String(row.id)) || { on_hand: 0, version: 1 };
      return [row.id,row.sku,row.name,row.glass_type,JSON.stringify(row.models || []),row.brand,row.glass_brand_id,imageMap.get(row.image_path) || null,String(row.sale_price),String(row.wholesale_price),costByProduct.get(String(row.id)) || '0',balance.on_hand,row.version,row.price_version,balance.version,row.active,mysqlDate(row.created_at),mysqlDate(row.deleted_at)];
    });
    await insertRows(db, 'customers', ['id','customer_type','name','phone','address','note','active','created_at','updated_at'], data.customers, (row) => [row.id,row.customer_type,row.name,row.phone,row.address,row.note,row.active,mysqlDate(row.created_at),mysqlDate(row.updated_at)]);
    await insertRows(db, 'sales_orders', ['id','order_no','status','created_by','confirmed_by','sales_user_id','customer_id','customer_name','customer_phone','customer_address','customer_type','fulfillment_status','missing_summary','note','payment_method','total_amount','version','exchange_return_id','created_at','updated_at','confirmed_at','cancelled_at','cancel_reason','cancel_refund_method'], data.sales_orders, (row) => [row.id,row.order_no,row.status,row.created_by,row.confirmed_by,row.sales_user_id,row.customer_id,row.customer_name,row.customer_phone,row.customer_address,row.customer_type,row.fulfillment_status,row.missing_summary,row.note,row.payment_method,String(row.total_amount),row.version,null,mysqlDate(row.created_at),mysqlDate(row.updated_at),mysqlDate(row.confirmed_at),mysqlDate(row.cancelled_at),row.cancel_reason,row.cancel_refund_method]);
    await insertRows(db, 'sales_order_items', ['id','order_id','product_id','quantity','custom_name','unit_sale_price','quoted_price_version','sku_snapshot','product_name_snapshot','item_kind','item_note','unit_cost_snapshot'], data.sales_order_items, (row) => [row.id,row.order_id,row.product_id,row.quantity,row.custom_name,String(row.custom_unit_price ?? row.unit_sale_price),row.quoted_price_version,row.sku_snapshot,row.product_name_snapshot,row.item_kind,row.item_note,costByItem.get(String(row.id)) ?? null]);
    await insertRows(db, 'sales_returns', ['id','return_no','order_id','reason','refund_amount','refund_method','created_by','posted_at'], data.sales_returns, (row) => [row.id,row.return_no,row.order_id,row.reason,String(row.refund_amount),row.refund_method,row.created_by,mysqlDate(row.posted_at)]);
    await insertRows(db, 'sales_return_items', ['id','return_id','order_item_id','quantity','restock_quantity','refund_amount'], data.sales_return_items, (row) => [row.id,row.return_id,row.order_item_id,row.quantity,row.restock_quantity,String(row.refund_amount)]);
    for (const row of data.sales_orders.filter((item) => item.exchange_return_id)) await db.execute('update sales_orders set exchange_return_id=? where id=?', [row.exchange_return_id, row.id]);
    await insertRows(db, 'sales_payments', ['id','order_id','amount','method','note','created_by','paid_at'], data.sales_payments, (row) => [row.id,row.order_id,String(row.amount),row.method,row.note,row.created_by,mysqlDate(row.paid_at)]);
    await insertRows(db, 'inventory_documents', ['id','document_no','type','reason','created_by','posted_at'], data.inventory_documents, (row) => [row.id,row.document_no,row.type,row.reason,row.created_by,mysqlDate(row.posted_at)]);
    await insertRows(db, 'inventory_document_items', ['id','document_id','product_id','quantity_delta','unit_purchase_price','fixed_cost_snapshot','sku_snapshot','name_snapshot'], data.inventory_document_items, (row) => [row.id,row.document_id,row.product_id,row.quantity_delta,row.unit_purchase_price === null ? null : String(row.unit_purchase_price),String(row.fixed_cost_snapshot),row.sku_snapshot,row.name_snapshot]);
    await insertRows(db, 'inventory_movements', ['id','product_id','movement_type','quantity_delta','balance_after','product_version_after','inventory_document_item_id','sale_order_item_id','return_item_id','actor_id','occurred_at'], data.inventory_movements, (row) => [row.id,row.product_id,row.movement_type,row.quantity_delta,row.balance_after,row.product_version_after,row.inventory_document_item_id,row.sale_order_item_id,row.return_item_id,row.actor_id,mysqlDate(row.occurred_at)]);
    await insertRows(db, 'audit_logs', ['id','actor_id','action','detail','created_at'], data.audit_logs, (row) => [row.id,row.actor_id,row.action,row.detail,mysqlDate(row.created_at)]);
    await db.commit();
  } catch (error) {
    await db.rollback().catch(() => {});
    for (const file of createdFiles) fs.rmSync(file, { force: true });
    throw error;
  } finally {
    db.release();
  }
}
async function verifyLocal(data, images) {
  const expected = {
    app_users: data.app_users.length, glass_brands: data.glass_brands.length, products: data.products.length,
    customers: data.customers.length, sales_orders: data.sales_orders.length, sales_order_items: data.sales_order_items.length,
    sales_returns: data.sales_returns.length, sales_return_items: data.sales_return_items.length, sales_payments: data.sales_payments.length,
    inventory_documents: data.inventory_documents.length, inventory_document_items: data.inventory_document_items.length,
    inventory_movements: data.inventory_movements.length, audit_logs: data.audit_logs.length,
  };
  const actual = {};
  for (const table of Object.keys(expected)) {
    const [[row]] = await pool.query(`select count(*) count from ${table}`);
    actual[table] = Number(row.count);
    if (actual[table] !== expected[table]) throw new Error(`Đối chiếu ${table} sai: ${actual[table]}/${expected[table]}`);
  }
  const sourceStock = data.inventory_balances.reduce((sum, row) => sum + Number(row.on_hand), 0);
  const [[stock]] = await pool.query('select coalesce(sum(on_hand),0) total from products');
  if (Number(stock.total) !== sourceStock) throw new Error(`Tổng tồn sai: ${stock.total}/${sourceStock}`);
  const [imageRows] = await pool.query('select image_path from products where image_path is not null');
  if (imageRows.length !== data.products.filter((row) => row.image_path).length) throw new Error('Số liên kết ảnh local không khớp nguồn.');
  for (const row of imageRows) if (!fs.existsSync(path.join(config.dataDir, 'uploads', ...row.image_path.split('/')))) throw new Error(`Thiếu file ảnh local: ${row.image_path}`);
  return { expected, actual, source_stock: sourceStock, local_stock: Number(stock.total), source_images: images.length, local_image_links: imageRows.length };
}
async function main() {
  const apply = process.argv.includes('--apply');
  const data = await readSource();
  const snapshotDir = path.join(config.dataDir, 'migration-snapshots', `supabase_${stamp()}`);
  fs.mkdirSync(snapshotDir, { recursive: true });
  const images = await downloadImages(data, snapshotDir);
  const sourceFile = path.join(snapshotDir, 'source.json');
  fs.writeFileSync(sourceFile, JSON.stringify({ exported_at: new Date().toISOString(), schema: 'app_ban_hang', tables: data, images }, null, 2));
  const summary = {
    mode: apply ? 'apply' : 'dry-run', snapshot: snapshotDir,
    counts: Object.fromEntries(sourceTables.map((table) => [table, data[table].length])),
    excluded: data._excluded, image_count: images.length,
    product_image_links: data.products.filter((row) => row.image_path).length,
    stock_total: data.inventory_balances.reduce((sum, row) => sum + Number(row.on_hand), 0),
    local_before: await inspectLocal(),
  };
  fs.writeFileSync(path.join(snapshotDir, 'summary.json'), JSON.stringify(summary, null, 2));
  const manifest = [sourceFile, path.join(snapshotDir, 'summary.json'), ...images.map((image) => path.join(snapshotDir, image.snapshot_file))]
    .map((file) => `${sha256(fs.readFileSync(file))}  ${path.relative(snapshotDir, file).replaceAll('\\', '/')}`);
  fs.writeFileSync(path.join(snapshotDir, 'SHA256SUMS.txt'), `${manifest.join('\n')}\n`);
  if (apply) {
    await applyToLocal(data, images, snapshotDir);
    summary.verification = await verifyLocal(data, images);
    fs.writeFileSync(path.join(snapshotDir, 'summary.json'), JSON.stringify(summary, null, 2));
    const finalManifest = [sourceFile, path.join(snapshotDir, 'summary.json'), ...images.map((image) => path.join(snapshotDir, image.snapshot_file))]
      .map((file) => `${sha256(fs.readFileSync(file))}  ${path.relative(snapshotDir, file).replaceAll('\\', '/')}`);
    fs.writeFileSync(path.join(snapshotDir, 'SHA256SUMS.txt'), `${finalManifest.join('\n')}\n`);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`Migration thất bại: ${error.message}`);
  process.exitCode = 1;
}).finally(() => pool.end());
