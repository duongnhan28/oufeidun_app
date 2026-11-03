const { assert, cleanText, moneyValue, positiveInt, moveStock, audit, newId } = require('./core.cjs');
const types = new Set(['clear','privacy','matte','other','full_border','premium_borderless']);
const {requireAdmin} = require('./auth.cjs');
const {resolveSku,reserveSku}=require('./sku-names.cjs');

// Called inside mutate's transaction: metadata, brands, costs and retry key commit together.
async function importProducts(db, payload, actor) {
  requireAdmin(actor);
  assert(Array.isArray(payload.items) && payload.items.length >= 1 && payload.items.length <= 100);
  const seen = new Set();
  const items = payload.items.map(item => {
    const sku = cleanText(item.sku, 50, true).toUpperCase();
    assert(sku.length <= 50 && !seen.has(sku) && types.has(item.glass_type));
    seen.add(sku);
    assert(Array.isArray(item.models) && item.models.length <= 500);
    const rawQuantity = item.quantity === undefined ? 0 : item.quantity;
    assert(/^\d+$/.test(String(rawQuantity)));
    const quantity = positiveInt(rawQuantity, true);
    return { sku, type: item.glass_type, brand: cleanText(item.brand || 'other', 100, true),
      quantity,
      glassBrand: cleanText(item.glass_brand, 100),
      models: [...new Set(item.models.map(value => cleanText(value, 200, true)))],
      sale: moneyValue(item.sale_price), wholesale: moneyValue(item.wholesale_price), cost: moneyValue(item.fixed_cost) };
  }).sort((a,b) => a.sku.localeCompare(b.sku));
  const brands = new Map();
  for (const name of [...new Set(items.map(item => item.glassBrand).filter(Boolean))].sort()) {
    await db.execute('INSERT INTO glass_brands(id,name) VALUES (?,?) ON DUPLICATE KEY UPDATE id=id', [newId(), name]);
    const [[brand]] = await db.execute('SELECT id FROM glass_brands WHERE name=? FOR UPDATE', [name]);
    brands.set(name, brand.id);
  }
  let created = 0, updated = 0;
  const reason = cleanText(payload.reason || 'Nhập Excel danh mục và số lượng', 1000, true);
  let documentId = null;
  const ids = new Set();
  for (const item of items) {
    const known=await resolveSku(db,item.sku);
    const id = newId();
    if(!known)await db.execute(`INSERT INTO products(id,sku,name,glass_type,models,brand,sale_price,wholesale_price,fixed_cost,glass_brand_id)
      VALUES (?,?,?,?,CAST(? AS JSON),?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
      [id,item.sku,item.sku,item.type,JSON.stringify(item.models),item.brand,item.sale,item.wholesale,item.cost,brands.get(item.glassBrand) || null]);
    const [[product]] = await db.execute('SELECT id,sku,name,deleted_at FROM products WHERE '+(known?'id':'sku')+'=? FOR UPDATE', [known?known.id:item.sku]);
    assert(product && !product.deleted_at, 'PRODUCT_NOT_FOUND', 409);
    await reserveSku(db,product.id,product.sku);
    // Also catch aliases considered equal by the database collation.
    assert(!ids.has(product.id)); ids.add(product.id);
    if (product.id === id) created++;
    else {
      await db.execute(`UPDATE products SET glass_type=?,models=CAST(? AS JSON),brand=?,glass_brand_id=?,
        price_version=price_version+IF(sale_price<>? OR wholesale_price<>?,1,0),
        sale_price=?,wholesale_price=?,fixed_cost=?,cost_configured=TRUE,version=version+1 WHERE id=?`,
        [item.type,JSON.stringify(item.models),item.brand,brands.get(item.glassBrand) || null,item.sale,item.wholesale,item.sale,item.wholesale,item.cost,product.id]);
      updated++;
    }
    if (item.quantity > 0) {
      if (!documentId) {
        documentId = newId();
        await db.execute('INSERT INTO inventory_documents(id,type,reason,created_by) VALUES (?,\'receipt\',?,?)', [documentId, reason, actor.id]);
      }
      const lineId = newId();
      // There is no purchase-price column; fixed cost is a separate accounting snapshot.
      await db.execute(`INSERT INTO inventory_document_items(id,document_id,product_id,quantity_delta,unit_purchase_price,fixed_cost_snapshot,sku_snapshot,name_snapshot)
        VALUES (?,?,?,?,NULL,?,?,?)`, [lineId,documentId,product.id,item.quantity,item.cost,product.sku,product.name]);
      await moveStock(db, product.id, item.quantity, 'receipt', actor.id, { doc: lineId });
    }
  }
  if (documentId) await audit(db, actor.id, 'inventory', `receipt: ${reason}`);
  return { created, updated };
}
module.exports = { importProducts };
