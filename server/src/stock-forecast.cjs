const {readSnapshot}=require('./core.cjs');
const {requireOperator}=require('./permissions.cjs');
const draftDemandSql=`SELECT i.product_id,SUM(i.quantity) draft_quantity
 FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id
 WHERE o.status='draft' GROUP BY i.product_id`;
async function stockForecast(actor,payload){
 requireOperator(actor);
 const [from,to]=require('./reports.cjs').period(payload.from,payload.to);
 return readSnapshot(async db=>{
  const [rows]=await db.execute(`SELECT p.id product_id,p.sku,p.glass_type,p.on_hand,
   COALESCE(d.draft_quantity,0) draft_quantity,COALESCE(m.delivered_quantity,0) delivered_quantity
   FROM products p LEFT JOIN (${draftDemandSql}) d ON d.product_id=p.id
   LEFT JOIN (SELECT product_id,SUM(-quantity_delta) delivered_quantity FROM inventory_movements
    WHERE movement_type='sale' AND occurred_at>=? AND occurred_at<? GROUP BY product_id) m ON m.product_id=p.id
   WHERE p.deleted_at IS NULL ORDER BY p.sku`,[from,to]);
  return {from:payload.from,to:payload.to,rows:rows.map(r=>({...r,on_hand:Number(r.on_hand),draft_quantity:Number(r.draft_quantity),delivered_quantity:Number(r.delivered_quantity),estimated_quantity:Number(r.on_hand)-Number(r.draft_quantity)}))};
 });
}
module.exports={draftDemandSql,stockForecast};
