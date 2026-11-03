const {assert}=require('./core.cjs');
async function reserveSku(db,productId,sku){
  await db.execute('INSERT INTO product_sku_names(sku,product_id) VALUES (?,?) ON DUPLICATE KEY UPDATE sku=sku',[sku,productId]);
  const [[owner]]=await db.execute('SELECT product_id FROM product_sku_names WHERE sku=? FOR UPDATE',[sku]);
  assert(owner&&owner.product_id===productId,'SKU_ALIAS_CONFLICT',409);
}
async function resolveSku(db,sku){
  const [[row]]=await db.execute('SELECT p.id,p.sku,p.name,p.deleted_at FROM product_sku_names n JOIN products p ON p.id=n.product_id WHERE n.sku=?',[sku]);
  return row||null;
}
module.exports={reserveSku,resolveSku};
