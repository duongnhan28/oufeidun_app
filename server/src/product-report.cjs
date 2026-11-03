const {readSnapshot,assert,uuid}=require('./core.cjs');
const {requirePermission}=require('./permissions.cjs');
const {period}=require('./reports.cjs');
const {isoLocal,orderNumber}=require('./workspace.cjs');
async function productReport(actor,payload){
 requirePermission(actor,'view_reports');
 const [from,to]=period(payload.from,payload.to),id=uuid(payload.product_id);
 const offset=Number(payload.offset||0),limit=payload.export===true?100001:200;
 assert(Number.isInteger(offset)&&offset>=0&&offset<=10000000);
 return readSnapshot(async db=>{
  const [[product]]=await db.execute('SELECT id,sku,glass_type FROM products WHERE id=?',[id]);assert(product,'PRODUCT_NOT_FOUND',404);
  const where="i.product_id=? AND o.confirmed_at IS NOT NULL AND o.status IN ('confirmed','partially_returned','returned') AND COALESCE(o.ordered_at,o.confirmed_at,o.created_at)>=? AND COALESCE(o.ordered_at,o.confirmed_at,o.created_at)<?";
  const joins=`FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id LEFT JOIN app_users u ON u.id=o.sales_user_id LEFT JOIN (SELECT ri.order_item_id,SUM(ri.quantity) quantity FROM sales_return_items ri JOIN sales_returns r ON r.id=ri.return_id WHERE r.posted_at<? GROUP BY ri.order_item_id) rt ON rt.order_item_id=i.id`;
  const params=[to,id,from,to];
  const [[summary]]=await db.execute(`SELECT COUNT(*) total,COALESCE(SUM(i.delivered_quantity-COALESCE(rt.quantity,0)),0) quantity,CAST(COALESCE(SUM((i.delivered_quantity-COALESCE(rt.quantity,0))*i.unit_sale_price),0) AS CHAR) revenue ${joins} WHERE ${where}`,params);
  assert(payload.export!==true||Number(summary.total)<=100000,'REPORT_TOO_LARGE',400);
  const [rows]=await db.query(`SELECT i.id,i.sku_snapshot sku,i.item_kind,i.quantity ordered,i.delivered_quantity delivered,COALESCE(rt.quantity,0) returned,i.delivered_quantity-COALESCE(rt.quantity,0) quantity,CAST(i.unit_sale_price AS CHAR) unit_price,CAST((i.delivered_quantity-COALESCE(rt.quantity,0))*i.unit_sale_price AS CHAR) revenue,o.id order_id,o.order_code,o.order_no,o.customer_name,COALESCE(u.display_name,creator.display_name) sales,COALESCE(o.ordered_at,o.confirmed_at,o.created_at) ordered_at ${joins} JOIN app_users creator ON creator.id=o.created_by WHERE ${where} ORDER BY ordered_at DESC,o.id,i.line_position,i.id LIMIT ${limit} OFFSET ${payload.export===true?0:offset}`,params);
  return {product,summary:{total:Number(summary.total),quantity:Number(summary.quantity),revenue:String(summary.revenue)},offset,rows:rows.map(r=>({...r,sku:r.sku||product.sku,order_no:r.order_code||orderNumber(r.order_no,'DH'),ordered_at:isoLocal(r.ordered_at),ordered:Number(r.ordered),delivered:Number(r.delivered),returned:Number(r.returned),quantity:Number(r.quantity)}))};
 });
}
module.exports={productReport};
