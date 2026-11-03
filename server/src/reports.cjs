const { readSnapshot, assert, jsonArray } = require('./core.cjs');
const { requireOperator,visibleData,requirePermission } = require('./permissions.cjs');
const { isoLocal, orderNumber } = require('./workspace.cjs');

function period(from, to) {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(String(from)) && /^\d{4}-\d{2}-\d{2}$/.test(String(to)));
  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(`${to}T00:00:00+07:00`);
  const calendarDate = date => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0,10);
  assert(Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) &&
    calendarDate(start) === from && calendarDate(end) === to &&
    end >= start && end.getTime() - start.getTime() < 366 * 86400000);
  const next = new Date(end.getTime() + 86400000);
  const sqlDate = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'medium' }).format(date);
  return [sqlDate(start), sqlDate(next)];
}

async function report(actor, payload) {
  requirePermission(actor,'view_reports');
  const [from, to] = period(payload.from, payload.to);
  const brand = String(payload.brand || 'all').trim();
  // One read-only snapshot keeps counts, fees, stock and sales consistent while
  // another workstation confirms/delivers/returns an order during this request.
  return readSnapshot(db => reportRows(actor, {from,to,brand}, db));
}

async function reportRows(actor, {from,to,brand}, db) {
  const brandWhere = brand === 'all' ? '' : ' AND p.brand=?';
  const brandParams = brand === 'all' ? [] : [brand];
  // Use the same business date as the order list. Confirmation time is audit
  // metadata; it must not move backdated/future-dated orders into another day.
  const soldWhere = `o.confirmed_at IS NOT NULL AND o.status IN ('confirmed','partially_returned','returned')
    AND COALESCE(o.ordered_at,o.confirmed_at,o.created_at)>=?
    AND COALESCE(o.ordered_at,o.confirmed_at,o.created_at)<?`;
  const [salesRows] = await db.query(`SELECT p.sku,p.name,p.glass_type,p.id product_id,(SELECT JSON_ARRAYAGG(n.sku) FROM product_sku_names n WHERE n.product_id=p.id AND BINARY n.sku<>BINARY p.sku) sku_aliases,CAST(i.unit_cost_snapshot AS CHAR) unit_cost,
    CAST(i.unit_sale_price AS CHAR) sale_price,
    SUM(i.delivered_quantity-COALESCE(ret.returned,0)) quantity,
    CAST(SUM((i.delivered_quantity-COALESCE(ret.returned,0))*i.unit_cost_snapshot) AS CHAR) total_cost,
    CAST(SUM((i.delivered_quantity-COALESCE(ret.returned,0))*i.unit_sale_price) AS CHAR) revenue,
    CAST(SUM((i.delivered_quantity-COALESCE(ret.returned,0))*(i.unit_sale_price-i.unit_cost_snapshot)) AS CHAR) profit
    FROM sales_orders o JOIN sales_order_items i ON i.order_id=o.id JOIN products p ON p.id=i.product_id
    LEFT JOIN (SELECT ri.order_item_id,SUM(ri.quantity) returned FROM sales_return_items ri JOIN sales_returns r ON r.id=ri.return_id WHERE r.posted_at<? GROUP BY ri.order_item_id) ret ON ret.order_item_id=i.id
    WHERE ${soldWhere} ${brandWhere}
    GROUP BY p.id,p.sku,p.name,p.glass_type,i.unit_cost_snapshot,i.unit_sale_price ORDER BY SUM((i.delivered_quantity-COALESCE(ret.returned,0))*i.unit_sale_price) DESC`, [to, from, to, ...brandParams]);
  const productRevenue = salesRows.reduce((sum,row) => sum + BigInt(row.revenue || 0), 0n);
  const cost = salesRows.reduce((sum,row) => sum + BigInt(row.total_cost || 0), 0n);
  const sold = salesRows.reduce((sum,row) => sum + Number(row.quantity || 0), 0);
  const [[refundRow]] = await db.query(`SELECT CAST(COALESCE(SUM(ri.refund_amount),0) AS CHAR) refunds
    FROM sales_return_items ri JOIN sales_returns r ON r.id=ri.return_id JOIN sales_order_items i ON i.id=ri.order_item_id JOIN products p ON p.id=i.product_id
    WHERE r.posted_at>=? AND r.posted_at<? ${brandWhere}`, [from, to, ...brandParams]);
  const [[cancelRow]] = await db.query(`SELECT CAST(COALESCE(SUM(i.delivered_quantity*i.unit_sale_price),0) AS CHAR) refunds
    FROM sales_orders o JOIN sales_order_items i ON i.order_id=o.id JOIN products p ON p.id=i.product_id
    WHERE o.cancelled_at>=? AND o.cancelled_at<? ${brandWhere}`, [from, to, ...brandParams]);
  const [[damageRow]] = await db.query(`SELECT CAST(COALESCE(SUM(-di.quantity_delta*di.fixed_cost_snapshot),0) AS CHAR) damage
    FROM inventory_document_items di JOIN inventory_documents d ON d.id=di.document_id JOIN products p ON p.id=di.product_id
    WHERE d.type='damage' AND d.posted_at>=? AND d.posted_at<? ${brandWhere}`, [from, to, ...brandParams]);
  const [inventoryRows] = await db.query(`SELECT p.sku,p.name,p.glass_type,(SELECT JSON_ARRAYAGG(n.sku) FROM product_sku_names n WHERE n.product_id=p.id AND BINARY n.sku<>BINARY p.sku) sku_aliases,
    COALESCE(SUM(CASE WHEN m.occurred_at<? THEN m.quantity_delta ELSE 0 END),0) opening,
    COALESCE(SUM(CASE WHEN m.occurred_at>=? AND m.occurred_at<? AND m.quantity_delta>0 THEN m.quantity_delta ELSE 0 END),0) incoming,
    COALESCE(-SUM(CASE WHEN m.occurred_at>=? AND m.occurred_at<? AND m.quantity_delta<0 THEN m.quantity_delta ELSE 0 END),0) outgoing,
    COALESCE(SUM(CASE WHEN m.occurred_at<? THEN m.quantity_delta ELSE 0 END),0) closing
    FROM products p LEFT JOIN inventory_movements m ON m.product_id=p.id AND m.occurred_at<?
    WHERE p.deleted_at IS NULL ${brandWhere}
    GROUP BY p.id,p.sku,p.name,p.glass_type ORDER BY p.sku LIMIT 5000`, [from, from, to, from, to, to, to, ...brandParams]);
  const [[stockRow]] = await db.query(`SELECT COALESCE(SUM(on_hand),0) stock,CAST(COALESCE(SUM(on_hand*fixed_cost),0) AS CHAR) stock_value FROM products p WHERE deleted_at IS NULL ${brandWhere}`, brandParams);
  const [[orderRow]] = await db.query(`SELECT COUNT(DISTINCT o.id) order_count FROM sales_orders o JOIN sales_order_items i ON i.order_id=o.id JOIN products p ON p.id=i.product_id WHERE ${soldWhere} ${brandWhere}`, [from, to, ...brandParams]);
  const [movementRows] = await db.query(`SELECT m.occurred_at,COALESCE(i.sku_snapshot,di.sku_snapshot,p.sku) sku,p.sku current_sku,p.name,p.glass_type,m.movement_type,m.quantity_delta,m.balance_after,
    COALESCE(sales.display_name,actor.display_name) sales,o.order_no internal_order_no,o.order_code,d.reason
    FROM inventory_movements m JOIN products p ON p.id=m.product_id JOIN app_users actor ON actor.id=m.actor_id
    LEFT JOIN sales_return_items ri ON ri.id=m.return_item_id
    LEFT JOIN sales_order_items i ON i.id=COALESCE(m.sale_order_item_id,ri.order_item_id) LEFT JOIN sales_orders o ON o.id=i.order_id
    LEFT JOIN app_users sales ON sales.id=o.sales_user_id
    LEFT JOIN inventory_document_items di ON di.id=m.inventory_document_item_id LEFT JOIN inventory_documents d ON d.id=di.document_id
    WHERE m.occurred_at>=? AND m.occurred_at<? ${brandWhere}
    ORDER BY m.occurred_at DESC LIMIT 10000`, [from, to, ...brandParams]);
  const refunds = BigInt(refundRow.refunds || 0) + BigInt(cancelRow.refunds || 0);
  const [[otherCharges]] = await db.query(`SELECT CAST(COALESCE(SUM(o.extra_cost),0) AS CHAR) amount FROM sales_orders o
    WHERE ${soldWhere}
    ${brand === 'all' ? '' : 'AND EXISTS (SELECT 1 FROM sales_order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=o.id AND p.brand=?)'}`, [from,to,...brandParams]);
  const revenue = productRevenue + BigInt(otherCharges.amount);
  const [[pendingCost]]=await db.query(`SELECT COUNT(*) n FROM products p WHERE p.deleted_at IS NULL AND p.on_hand>0 AND p.cost_configured=FALSE ${brandWhere}`,brandParams);
  return visibleData(actor,{
    product_revenue: productRevenue.toString(),
    other_charges: String(otherCharges.amount), order_value: revenue.toString(),
    revenue: revenue.toString(), cost: cost.toString(), profit: (revenue - cost).toString(), refunds: refunds.toString(),
    damage: String(damageRow.damage || '0'), sold, stock: Number(stockRow.stock), stock_value: String(stockRow.stock_value),
    order_count: Number(orderRow.order_count),
    unconfigured_products:Number(pendingCost.n),
    sales: salesRows.map(row => ({ ...row, sku_aliases:jsonArray(row.sku_aliases), quantity: Number(row.quantity) })),
    movements: movementRows.map(({order_code,internal_order_no,...row}) => ({ ...row, quantity_delta: Number(row.quantity_delta), balance_after: Number(row.balance_after), occurred_at: isoLocal(row.occurred_at), order_no: order_code || (internal_order_no ? orderNumber(internal_order_no, 'DH') : null) })),
    inventory: inventoryRows.map(row => ({ ...row, sku_aliases:jsonArray(row.sku_aliases), opening: Number(row.opening), incoming: Number(row.incoming), outgoing: Number(row.outgoing), closing: Number(row.closing) })),
  });
}

module.exports = { report, period };
