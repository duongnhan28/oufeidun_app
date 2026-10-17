const fs = require('node:fs');
const crypto = require('node:crypto');
const { Client } = require('pg');

function parseEnv(file) {
  const result = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) result[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return result;
}

async function main() {
  const envFile = process.env.OUFEIDUN_SUPABASE_ENV || 'E:/mhpGroup/.env.supabase.local';
  const env = parseEnv(envFile);
  const connectionString = String(env.SUPABASE_MIGRATION_URL || env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]+/, '');
  if (!connectionString) throw new Error('Thiếu SUPABASE_MIGRATION_URL hoặc DATABASE_URL.');
  const caFile = process.env.OUFEIDUN_SUPABASE_CA || '.local/supabase-root-2021.crt';
  const ssl = fs.existsSync(caFile)
    ? { ca: fs.readFileSync(caFile, 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
  const db = new Client({ connectionString, ssl });
  await db.connect();
  try {
    const functions = [
      'app_ban_hang_resolve_login', 'app_ban_hang_claim_session', 'app_ban_hang_touch_session',
      'app_ban_hang_release_session', 'app_ban_hang_read', 'app_ban_hang_write',
      'app_ban_hang_list_users', 'app_ban_hang_order_extras', 'app_ban_hang_business_extras',
      'app_ban_hang_report', 'app_ban_hang_detailed_report', 'app_ban_hang_customer',
      'app_ban_hang_order_business', 'app_ban_hang_order_features', 'app_ban_hang_set_wholesale_price',
      'app_ban_hang_bulk_price', 'app_ban_hang_delete_product', 'app_ban_hang_manage_staff',
    ];
    const functionRows = await db.query(
      `select distinct p.proname,pg_get_functiondef(p.oid) def from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname=any($1)`, [functions],
    );
    const definitions = new Map(functionRows.rows.map((row) => [row.proname, row.def.toLowerCase()]));
    const tables = [
      'app_users', 'products', 'product_costs', 'inventory_balances', 'sales_orders',
      'sales_order_items', 'inventory_documents', 'inventory_document_items', 'inventory_movements',
      'sales_returns', 'sales_return_items', 'audit_logs', 'mutation_requests', 'active_sessions',
      'sales_payments', 'customers', 'customer_product_prices',
    ];
    const tableRows = await db.query(
      `select table_name from information_schema.tables
       where table_schema='app_ban_hang' and table_name=any($1)`, [tables],
    );
    const tableSet = new Set(tableRows.rows.map((row) => row.table_name));
    const columns = [
      'products.wholesale_price', 'sales_orders.customer_address', 'sales_orders.customer_type',
      'sales_orders.customer_id', 'sales_orders.fulfillment_status', 'sales_orders.missing_summary',
      'sales_orders.sales_user_id', 'sales_orders.order_code', 'sales_order_items.custom_unit_price',
      'sales_order_items.item_kind', 'sales_order_items.item_note', 'sales_order_items.price_overridden',
      'sales_order_items.price_source',
    ];
    const columnRows = await db.query(
      `select table_name,column_name from information_schema.columns where table_schema='app_ban_hang'`,
    );
    const columnSet = new Set(columnRows.rows.map((row) => `${row.table_name}.${row.column_name}`));
    const indexes = [
      'sales_payments_order', 'orders_customer', 'orders_sales_user',
      'customer_product_prices_product', 'sales_orders_order_code_unique',
    ];
    const indexRows = await db.query(`select indexname from pg_indexes where schemaname='app_ban_hang'`);
    const indexSet = new Set(indexRows.rows.map((row) => row.indexname));
    const trigger = await db.query(
      `select count(*)::int n from pg_trigger t join pg_class r on r.oid=t.tgrelid
       join pg_namespace n on n.oid=r.relnamespace
       where n.nspname='app_ban_hang' and r.relname='sales_order_items'
       and t.tgname='preserve_order_item_price' and not t.tgisinternal`,
    );
    const bucket = await db.query(
      `select count(*)::int n from storage.buckets where id='app-ban-hang-product-images'`,
    );
    const markers = {
      app_ban_hang_business_extras: ['customer_prices', 'order_code'],
      app_ban_hang_order_business: ['order_code', 'sales_user_id'],
      app_ban_hang_order_features: ['price_overridden', 'save_customer_price', 'zero_price_confirm'],
      app_ban_hang_order_extras: ['price_overridden', 'price_source'],
    };
    const missingMarkers = [];
    for (const [name, values] of Object.entries(markers)) {
      for (const value of values) if (!(definitions.get(name) || '').includes(value)) missingMarkers.push(`${name}:${value}`);
    }
    const audit = {
      missingFunctions: functions.filter((name) => !definitions.has(name)),
      missingTables: tables.filter((name) => !tableSet.has(name)),
      missingColumns: columns.filter((name) => !columnSet.has(name)),
      missingIndexes: indexes.filter((name) => !indexSet.has(name)),
      missingFunctionMarkers: missingMarkers,
      priceTrigger: trigger.rows[0].n === 1,
      imageBucket: bucket.rows[0].n === 1,
    };
    if (Object.values(audit).some((value) => Array.isArray(value) && value.length) || !audit.priceTrigger || !audit.imageBucket) {
      throw new Error(`Supabase chưa ngang tính năng local:\n${JSON.stringify(audit, null, 2)}`);
    }

    await db.query('begin');
    try {
      const admin = (await db.query(
        `select id from app_ban_hang.app_users where role='admin' and active order by created_at limit 1`,
      )).rows[0];
      const product = (await db.query(
        `select id from app_ban_hang.products where active and deleted_at is null order by sku limit 1`,
      )).rows[0];
      if (!admin || !product) throw new Error('Cần ít nhất một Admin và một sản phẩm đang bán để smoke test.');
      const sessionId = crypto.randomUUID();
      await db.query(
        `insert into app_ban_hang.active_sessions(user_id,auth_session_id,device_id) values($1,$2,$3)
         on conflict(user_id) do update set auth_session_id=excluded.auth_session_id,
         device_id=excluded.device_id,last_seen_at=now()`,
        [admin.id, sessionId, crypto.randomUUID()],
      );
      await db.query(`select set_config('request.jwt.claims',$1,true)`, [
        JSON.stringify({ sub: admin.id, session_id: sessionId, role: 'authenticated' }),
      ]);
      const makeDraft = async (name) => (await db.query(
        `select public.app_ban_hang_write($1::jsonb) result`,
        [JSON.stringify({
          action: 'save_draft', key: crypto.randomUUID(), id: null,
          items: [{ product_id: product.id, quantity: 1, custom_name: null }],
          customer_name: name, customer_phone: '0900000000', note: '',
        })],
      )).rows[0].result.id;
      const draft = await makeDraft('Khách smoke Supabase');
      const customer = (await db.query(`select public.app_ban_hang_customer($1::jsonb) result`, [
        JSON.stringify({
          customer_type: 'wholesale', name: 'Đại lý smoke Supabase',
          phone: `09${Date.now().toString().slice(-8)}`, address: 'Địa chỉ test', note: '',
        }),
      ])).rows[0].result.id;
      const orderCode = `SUPA-${Date.now()}`;
      await db.query(`select public.app_ban_hang_order_business($1::jsonb)`, [JSON.stringify({
        order_id: draft, order_code: orderCode, customer_id: customer,
        sales_user_id: admin.id, fulfillment_status: 'short', missing_summary: 'Thiếu hàng test',
      })]);
      await db.query(`select public.app_ban_hang_order_features($1::jsonb)`, [JSON.stringify({
        action: 'save', order_id: draft, customer_address: 'Địa chỉ test', customer_type: 'wholesale',
        items: [{
          product_id: product.id, unit_sale_price: '19001', price_overridden: true,
          save_customer_price: true, zero_price_confirm: false, item_kind: 'sale', item_note: 'Smoke test',
        }],
      })]);
      const item = (await db.query(
        `select unit_sale_price::text,price_overridden,price_source from app_ban_hang.sales_order_items
         where order_id=$1 and product_id=$2`, [draft, product.id],
      )).rows[0];
      const savedPrice = (await db.query(
        `select unit_price::text from app_ban_hang.customer_product_prices where customer_id=$1 and product_id=$2`,
        [customer, product.id],
      )).rows[0];
      const extras = (await db.query(`select public.app_ban_hang_business_extras() result`)).rows[0].result;
      const order = extras.orders.find((value) => value.id === draft);
      if (item.unit_sale_price !== '19001' || !item.price_overridden || item.price_source !== 'manual'
        || savedPrice.unit_price !== '19001' || order.order_no !== orderCode || order.fulfillment_status !== 'short') {
        throw new Error('Smoke test giá/mã đơn/tình trạng không đúng.');
      }
      const secondDraft = await makeDraft('Khách mã trùng');
      await db.query('savepoint duplicate_check');
      let duplicateBlocked = false;
      try {
        await db.query(`select public.app_ban_hang_order_business($1::jsonb)`, [JSON.stringify({
          order_id: secondDraft, order_code: orderCode.toLowerCase(), customer_id: '',
          sales_user_id: admin.id, fulfillment_status: 'complete', missing_summary: '',
        })]);
      } catch (error) {
        duplicateBlocked = /ORDER_CODE_EXISTS/.test(String(error.message));
        await db.query('rollback to savepoint duplicate_check');
      }
      if (!duplicateBlocked) throw new Error('Supabase không chặn mã đơn trùng khác hoa/thường.');
      const report = (await db.query(`select public.app_ban_hang_detailed_report($1::jsonb) result`, [
        JSON.stringify({ from: '2026-01-01', to: '2026-12-31', brand: 'all' }),
      ])).rows[0].result;
      if (!Array.isArray(report.sales) || !Array.isArray(report.movements)) throw new Error('Báo cáo chi tiết không hợp lệ.');
    } finally {
      await db.query('rollback');
    }
    console.log('Supabase parity passed: schema/RPC/storage and transactional business smoke test; test data rolled back.');
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
