const { pool, readSnapshot, assert, uuid, jsonArray, publicUser } = require('./core.cjs');
const { requireOperator,visibleData,allowed } = require('./permissions.cjs');
const {draftDemandSql}=require('./stock-forecast.cjs');

function isoLocal(value) {
  if (!value) return value;
  return String(value).replace(' ', 'T') + '+07:00';
}
function orderNumber(value, prefix) { return `${prefix}-${String(value).padStart(5, '0')}`; }

async function workspace(actor) {
  return readSnapshot(db => workspaceRows(actor,db));
}

async function workspaceRows(actor,db) {
  const productSql = `SELECT id,sku,name,glass_type,models,brand,glass_brand_id,image_path,
    CAST(sale_price AS CHAR) sale_price,CAST(wholesale_price AS CHAR) wholesale_price,
    CAST(fixed_cost AS CHAR) fixed_cost,cost_configured,on_hand,version,price_version,stock_version,active
    ,(SELECT JSON_ARRAYAGG(n.sku) FROM product_sku_names n WHERE n.product_id=products.id AND BINARY n.sku<>BINARY products.sku) sku_aliases
    FROM products WHERE deleted_at IS NULL ORDER BY sku LIMIT 5000`;
  const orderSql = `SELECT o.*,creator.display_name creator_name,COALESCE(sales.display_name,creator.display_name) sales_name
    FROM sales_orders o JOIN app_users creator ON creator.id=o.created_by
    LEFT JOIN app_users sales ON sales.id=o.sales_user_id
    WHERE o.status<>'deleted'
    ORDER BY o.updated_at DESC LIMIT 500`;
  const [productsResult, ordersResult, brandsResult, customersResult, customerPricesResult, usersResult, logsResult, demandResult] = await Promise.all([
    db.query(productSql),
    db.query(orderSql),
    db.query('SELECT id,name FROM glass_brands ORDER BY name'),
    db.query('SELECT id,customer_type,name,phone,address,note,active,created_at,updated_at FROM customers WHERE active=TRUE ORDER BY updated_at DESC'),
    db.query('SELECT customer_id,product_id,CAST(unit_price AS CHAR) unit_price FROM customer_product_prices ORDER BY customer_id,product_id'),
    db.query('SELECT id,display_name,role,active,permissions,permissions_version FROM app_users WHERE deleted_at IS NULL ORDER BY role,display_name'),
    db.query(`SELECT l.id,l.action,l.detail,l.created_at,u.display_name actor_name FROM audit_logs l JOIN app_users u ON u.id=l.actor_id
      WHERE l.action IN ('confirm_order','deliver_order','product.rename','staff.permissions') OR (l.action='inventory' AND (l.detail LIKE 'receipt:%' OR l.detail LIKE 'opening:%' OR l.detail LIKE 'adjustment:%'))
      ORDER BY l.created_at DESC LIMIT 100`),
    db.query(draftDemandSql),
  ]);
  const demand=new Map(demandResult[0].map(row=>[row.product_id,Number(row.draft_quantity)]));
  const products = productsResult[0].map(row => {
    const result = { ...row, models: jsonArray(row.models), sku_aliases: jsonArray(row.sku_aliases), active: Boolean(row.active), cost_configured:Boolean(row.cost_configured), on_hand: Number(row.on_hand), version: Number(row.version), price_version: Number(row.price_version), stock_version: Number(row.stock_version) };
    if (actor.role !== 'admin') delete result.fixed_cost;
    result.draft_quantity=demand.get(row.id)||0;
    return result;
  });
  const orders = ordersResult[0];
  const ids = orders.map(row => row.id);
  let items = [], returns = [], returnItems = [], payments = [], deliveryBatches = [], deliveryItems = [];
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    [items, returns, payments, deliveryBatches] = (await Promise.all([
      db.query(`SELECT i.*,(SELECT COALESCE(SUM(ri.quantity),0) FROM sales_return_items ri WHERE ri.order_item_id=i.id) returned_quantity FROM sales_order_items i WHERE i.order_id IN (${placeholders}) ORDER BY i.line_position,i.id`, ids),
      db.query(`SELECT * FROM sales_returns WHERE order_id IN (${placeholders}) ORDER BY posted_at`, ids),
      db.query(`SELECT p.*,u.display_name actor_name FROM sales_payments p JOIN app_users u ON u.id=p.created_by WHERE p.order_id IN (${placeholders}) ORDER BY paid_at`, ids),
      db.query(`SELECT b.*,u.display_name actor_name FROM order_delivery_batches b JOIN app_users u ON u.id=b.delivered_by WHERE b.order_id IN (${placeholders}) ORDER BY b.order_id,b.sequence_no`, ids),
    ])).map(result => result[0]);
    if (deliveryBatches.length) {
      const batchIds = deliveryBatches.map(row => row.id);
      deliveryItems = (await db.query(`SELECT di.*,i.product_id,i.sku_snapshot,i.product_name_snapshot,i.custom_name FROM order_delivery_items di JOIN sales_order_items i ON i.id=di.order_item_id WHERE di.batch_id IN (${batchIds.map(() => '?').join(',')}) ORDER BY di.batch_id,i.line_position,i.id`, batchIds))[0];
    }
    if (returns.length) {
      const returnIds = returns.map(row => row.id);
      returnItems = (await db.query(`SELECT * FROM sales_return_items WHERE return_id IN (${returnIds.map(() => '?').join(',')})`, returnIds))[0];
    }
  }
  const itemMap = new Map();
  for (const item of items) {
    const list = itemMap.get(item.order_id) || [];
    list.push({ id: item.id, product_id: item.product_id, quantity: Number(item.quantity), delivered_quantity: Number(item.delivered_quantity), missing_quantity: Math.max(0, Number(item.quantity) - Number(item.delivered_quantity)), custom_name: item.custom_name, unit_sale_price: String(item.unit_sale_price), price_overridden: Boolean(item.price_overridden), price_source: item.price_source, quoted_price_version: Number(item.quoted_price_version), sku_snapshot: item.sku_snapshot, product_name_snapshot: item.product_name_snapshot, returned_quantity: Number(item.returned_quantity), item_kind: item.item_kind, item_note: item.item_note });
    list[list.length - 1].models_snapshot = item.models_snapshot == null ? null : jsonArray(item.models_snapshot);
    itemMap.set(item.order_id, list);
  }
  const returnItemMap = new Map();
  for (const item of returnItems) {
    const list = returnItemMap.get(item.return_id) || [];
    list.push({ order_item_id: item.order_item_id, quantity: Number(item.quantity), restock_quantity: Number(item.restock_quantity) });
    returnItemMap.set(item.return_id, list);
  }
  const returnMap = new Map();
  for (const row of returns) {
    const list = returnMap.get(row.order_id) || [];
    list.push({ id: row.id, return_no: orderNumber(row.return_no, 'TH'), posted_at: isoLocal(row.posted_at), refund_amount: String(row.refund_amount), reason: row.reason, items: returnItemMap.get(row.id) || [] });
    returnMap.set(row.order_id, list);
  }
  const paymentMap = new Map();
  for (const row of payments) {
    const list = paymentMap.get(row.order_id) || [];
    list.push({ id: row.id, amount: String(row.amount), method: row.method, note: row.note, paid_at: isoLocal(row.paid_at), actor_name: row.actor_name });
    paymentMap.set(row.order_id, list);
  }
  const deliveryItemMap = new Map();
  for (const item of deliveryItems) {
    const list = deliveryItemMap.get(item.batch_id) || [];
    list.push({ order_item_id: item.order_item_id, product_id: item.product_id, sku: item.sku_snapshot, name: item.product_name_snapshot || item.custom_name, quantity: Number(item.quantity), unit_price: String(item.unit_price_snapshot), amount: (BigInt(String(item.unit_price_snapshot)) * BigInt(item.quantity)).toString() });
    deliveryItemMap.set(item.batch_id, list);
  }
  const deliveryMap = new Map();
  for (const batch of deliveryBatches) {
    const batchItems = deliveryItemMap.get(batch.id) || [];
    const list = deliveryMap.get(batch.order_id) || [];
    list.push({ id: batch.id, sequence_no: Number(batch.sequence_no), delivery_kind: batch.delivery_kind, delivered_at: isoLocal(batch.delivered_at), actor_name: batch.actor_name, total_quantity: batchItems.reduce((sum, item) => sum + item.quantity, 0), total_amount: batchItems.reduce((sum, item) => sum + BigInt(item.amount), 0n).toString(), items: batchItems });
    deliveryMap.set(batch.order_id, list);
  }
  const orderList = orders.map(row => {
    const orderPayments = paymentMap.get(row.id) || [];
    const paid = orderPayments.reduce((sum, payment) => sum + BigInt(payment.amount), 0n);
    const total = BigInt(row.total_amount);
    return {
      id: row.id, order_no: row.order_code || orderNumber(row.order_no, 'DH'), status: row.status, created_by: row.created_by,
      creator_name: row.creator_name, sales_user_id: row.sales_user_id, sales_name: row.sales_name,
      customer_name: row.customer_name, customer_phone: row.customer_phone, customer_address: row.customer_address,
      customer_type: row.customer_type, customer_id: row.customer_id, fulfillment_status: row.fulfillment_status,
      missing_summary: row.missing_summary, note: row.note, payment_method: row.payment_method,
      payment_status: paid === 0n ? 'unpaid' : paid < total ? 'partial' : 'paid', paid_amount: paid.toString(),
      outstanding_amount: (total - paid).toString(), payments: orderPayments, total_amount: String(row.total_amount),
      ordered_at: isoLocal(row.ordered_at || row.confirmed_at || row.created_at), extra_cost: String(row.extra_cost), extra_cost_note: row.extra_cost_note,
      created_at: isoLocal(row.created_at), confirmed_at: isoLocal(row.confirmed_at), cancelled_at: isoLocal(row.cancelled_at),
      version: Number(row.version), items: itemMap.get(row.id) || [], deliveries: deliveryMap.get(row.id) || [], returns: returnMap.get(row.id) || [], exchange_return_id: row.exchange_return_id,
    };
  });
  return {
    me: publicUser(actor),
    glass_brands: brandsResult[0], products, orders: orderList,
    users: usersResult[0].map(publicUser),
    salespeople: usersResult[0].filter(row => Boolean(row.active)).map(publicUser),
    logs: allowed(actor,'view_audit')?logsResult[0].map(row => ({ ...row, created_at: isoLocal(row.created_at) })):[],
    customers: customersResult[0].map(row => ({ ...row, active: Boolean(row.active), created_at: isoLocal(row.created_at), updated_at: isoLocal(row.updated_at) })),
    customer_prices: customerPricesResult[0],
  };
}

async function history(actor, payload) {
  requireOperator(actor);
  const productId = uuid(payload.product_id);
  const [rows] = await pool.execute(`SELECT m.*,COALESCE(i.sku_snapshot,di.sku_snapshot,p.sku) sku,p.sku current_sku,p.name,u.display_name actor_name,d.reason
    FROM inventory_movements m JOIN products p ON p.id=m.product_id JOIN app_users u ON u.id=m.actor_id
    LEFT JOIN inventory_document_items di ON di.id=m.inventory_document_item_id LEFT JOIN inventory_documents d ON d.id=di.document_id
    LEFT JOIN sales_return_items ri ON ri.id=m.return_item_id LEFT JOIN sales_order_items i ON i.id=COALESCE(m.sale_order_item_id,ri.order_item_id)
    WHERE m.product_id=? ORDER BY m.product_version_after DESC LIMIT 100`, [productId]);
  return visibleData(actor,rows.map(row => ({ ...row, quantity_delta: Number(row.quantity_delta), balance_after: Number(row.balance_after), product_version_after: Number(row.product_version_after), occurred_at: isoLocal(row.occurred_at) })));
}

module.exports = { workspace, history, isoLocal, orderNumber };
