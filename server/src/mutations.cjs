const { appError, assert, uuid, newId, cleanText, moneyValue, positiveInt, canonical, transaction, audit, moveStock, jsonArray } = require('./core.cjs');

const glassTypes = new Set(['clear','privacy','matte','other','full_border','premium_borderless']);
const { orderDate } = require('./order-details.cjs');
const {requireOperator,rejectCostWrite} = require('./permissions.cjs');

async function lockOrder(db, actor, id) {
  const [[order]] = await db.execute('SELECT * FROM sales_orders WHERE id=? FOR UPDATE', [uuid(id)]);
  requireOperator(actor);
  assert(order, 'ORDER_NOT_FOUND', 404);
  return order;
}
async function lockProducts(db, ids) {
  const unique = [...new Set(ids.map(uuid))].sort();
  if (!unique.length) return [];
  const [rows] = await db.query(`SELECT * FROM products WHERE id IN (${unique.map(() => '?').join(',')}) AND deleted_at IS NULL ORDER BY id FOR UPDATE`, unique);
  assert(rows.length === unique.length, 'PRODUCT_NOT_FOUND', 404);
  return rows;
}

async function mutate(actor, payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload));
  const action = String(payload.action || '');
  const key = uuid(payload.key);
  requireOperator(actor);
  // Receiving stock (including opening balances and catalog imports) stays Admin-only.
  if (actor.role !== 'admin') {
    assert(action !== 'import_products' && !(action === 'inventory' && ['receipt','opening'].includes(payload.type)), 'FORBIDDEN',403);
  }
  return transaction(async db => {
    const payloadText = canonical(payload);
    await db.execute('INSERT IGNORE INTO mutation_requests(actor_id,request_key,payload) VALUES (?,?,CAST(? AS JSON))', [actor.id, key, payloadText]);
    const [[request]] = await db.execute('SELECT payload,result FROM mutation_requests WHERE actor_id=? AND request_key=? FOR UPDATE', [actor.id, key]);
    assert(canonical(request.payload) === payloadText, 'IDEMPOTENCY_CONFLICT', 409);
    if (request.result) return typeof request.result === 'string' ? JSON.parse(request.result) : request.result;
    let result;
    let detail = '';

    if (action === 'save_draft') {
      const items = Array.isArray(payload.items) ? payload.items : [];
      assert(items.length >= 1 && items.length <= 100);
      const orderCode = cleanText(payload.order_code, 50, true);
      const [duplicateCodes] = await db.execute('SELECT id FROM sales_orders WHERE LOWER(order_code)=LOWER(?) AND (? IS NULL OR id<>?) LIMIT 1 FOR UPDATE', [orderCode, payload.id || null, payload.id || null]);
      assert(!duplicateCodes.length, 'ORDER_CODE_EXISTS', 409);
      const customerName = cleanText(payload.customer_name, 200, true);
      const customerPhone = cleanText(payload.customer_phone, 30, true);
      const note = cleanText(payload.note, 1000);
      const orderedAt = payload.ordered_at === undefined ? null : orderDate(payload.ordered_at);
      const extraCost = payload.extra_cost === undefined ? null : moneyValue(payload.extra_cost);
      const extraCostNote = payload.extra_cost_note === undefined ? null : cleanText(payload.extra_cost_note, 1000);
      const products = await lockProducts(db, items.map(item => item.product_id));
      const productMap = new Map(products.map(product => [product.id, product]));
      let orderId;
      if (payload.id) {
        const order = await lockOrder(db, actor, payload.id);
        assert(order.status === 'draft', 'INVALID_ORDER_STATE', 409);
        assert(Number(order.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
        orderId = order.id;
        await db.execute('DELETE FROM sales_order_items WHERE order_id=?', [orderId]);
        await db.execute(`UPDATE sales_orders SET order_code=?,customer_name=?,customer_phone=?,note=?,ordered_at=COALESCE(?,ordered_at),extra_cost=COALESCE(?,extra_cost),extra_cost_note=COALESCE(?,extra_cost_note),total_amount=0,version=version+1,updated_at=NOW(3) WHERE id=?`, [orderCode, customerName, customerPhone, note, orderedAt, extraCost, extraCostNote, orderId]);
      } else {
        orderId = newId();
        await db.execute(`INSERT INTO sales_orders(id,order_code,created_by,sales_user_id,customer_name,customer_phone,note,ordered_at,extra_cost,extra_cost_note) VALUES (?,?,?,?,?,?,?,COALESCE(?,NOW(3)),?,?)`, [orderId, orderCode, actor.id, actor.id, customerName, customerPhone, note, orderedAt, extraCost ?? '0', extraCostNote ?? '']);
      }
      let total = 0n;
      const draftLines=new Set();
      for (const [position, item] of items.entries()) {
        const kind=item.item_kind||'sale';assert(['sale','gift','sample'].includes(kind));
        const identity=item.product_id+':'+kind;assert(!draftLines.has(identity));draftLines.add(identity);
        const product = productMap.get(uuid(item.product_id));
        assert(product && product.active, 'PRODUCT_INACTIVE', 409);
        const quantity = positiveInt(item.quantity);
        const customName = item.custom_name == null ? null : cleanText(item.custom_name, 200, true);
        const price = kind==='sale'?String(product.sale_price):'0';
        total += BigInt(price) * BigInt(quantity);
        await db.execute(`INSERT INTO sales_order_items
          (id,order_id,product_id,quantity,custom_name,unit_sale_price,quoted_price_version,item_kind,line_position)
          VALUES (?,?,?,?,?,?,?,?,?)`, [newId(), orderId, product.id, quantity, customName, price, product.price_version,kind,position]);
      }
      await db.execute('UPDATE sales_orders SET total_amount=?+extra_cost WHERE id=?', [total.toString(), orderId]);
      if (payload.sale_details) {
        const services=require('./services.cjs');
        const details=payload.sale_details;
        const customer=await services.saveCustomer(actor,{id:details.customer_id,customer_type:details.customer_type,name:customerName,phone:customerPhone,address:details.customer_address,note:details.customer_note||''},db);
        await services.saveOrderBusiness(actor,{order_id:orderId,order_code:orderCode,customer_id:customer.id,sales_user_id:details.sales_user_id,fulfillment_status:details.fulfillment_status,missing_summary:details.missing_summary},db);
        await services.saveOrderFeatures(actor,{...details,action:'save',order_id:orderId,items:items},db);
      }
      result = { id: orderId }; detail = orderId;

    } else if (action === 'order_date') {
      const order = await lockOrder(db, actor, payload.id);
      assert(['draft','confirmed','partially_returned','returned'].includes(order.status), 'INVALID_ORDER_STATE', 409);
      assert(Number(order.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
      const date = orderDate(payload.ordered_at);
      await db.execute('UPDATE sales_orders SET ordered_at=?,version=version+1,updated_at=NOW(3) WHERE id=?', [date, order.id]);
      result = { id: order.id }; detail = `${order.id} / ${order.ordered_at} -> ${date}`;
    } else if (action === 'delete_draft') {
      const order = await lockOrder(db, actor, payload.id);
      assert(order.status === 'draft', 'INVALID_ORDER_STATE', 409);
      assert(Number(order.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
      await db.execute("UPDATE sales_orders SET status='deleted',exchange_return_id=NULL,version=version+1,updated_at=NOW(3) WHERE id=?", [order.id]);
      result = { id: order.id }; detail = order.id;

    } else if (action === 'confirm_order') {
      const order = await lockOrder(db, actor, payload.id);
      assert(order.status === 'draft', 'INVALID_ORDER_STATE', 409);
      assert(Number(order.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
      assert(['cash','transfer','cod','cod_transfer','cash_transfer'].includes(payload.payment_method));
      const [items] = await db.execute('SELECT * FROM sales_order_items WHERE order_id=? ORDER BY product_id FOR UPDATE', [order.id]);
      assert(items.length > 0);
      const products = await lockProducts(db, items.map(item => item.product_id));
      const productMap = new Map(products.map(product => [product.id, product]));
      const requestedDeliveries = new Map((Array.isArray(payload.deliveries) ? payload.deliveries : []).map(item => [uuid(item.order_item_id), positiveInt(item.quantity, true)]));
      assert(!Array.isArray(payload.deliveries)||requestedDeliveries.size===payload.deliveries.length);
      const deliveryBatchId = newId();
      await db.execute(`INSERT INTO order_delivery_batches(id,order_id,sequence_no,delivery_kind,delivered_by)
        VALUES (?,?,1,'initial',?)`, [deliveryBatchId, order.id, actor.id]);
      let total = 0n;
      let stillShort = false;
      const lineTypes = new Set();
      for (const item of items) {
        const kind=item.item_kind || 'sale';assert(['sale','gift','sample'].includes(kind));
        const lineKey=item.product_id+':'+kind;assert(!lineTypes.has(lineKey));lineTypes.add(lineKey);
        const product = productMap.get(item.product_id);
        assert(product.active, 'PRODUCT_INACTIVE', 409);
        assert(Number(product.price_version) === Number(item.quoted_price_version), 'PRICE_CHANGED', 409);
        let expectedPrice = String(product.sale_price);
        if (order.customer_type === 'wholesale') {
          expectedPrice = String(product.wholesale_price);
          if (order.customer_id) {
            const [[savedPrice]] = await db.execute('SELECT unit_price FROM customer_product_prices WHERE customer_id=? AND product_id=?', [order.customer_id, product.id]);
            if (savedPrice) expectedPrice = String(savedPrice.unit_price);
          }
        }
        if (item.item_kind !== 'sale') expectedPrice = '0';
        if (!item.price_overridden) {
          assert(Number(product.price_version) === Number(item.quoted_price_version), 'PRICE_CHANGED', 409);
          assert(String(item.unit_sale_price) === expectedPrice, 'PRICE_CHANGED', 409);
        }
        const price = String(item.unit_sale_price);
        const ordered = Number(item.quantity);
        const delivered = order.fulfillment_status === 'complete'
          ? ordered
          : requestedDeliveries.has(item.id)
            ? requestedDeliveries.get(item.id)
            : Math.min(ordered, Number(product.on_hand));
        assert(delivered <= ordered, 'DELIVERY_EXCEEDS_ORDERED', 409);
        assert(delivered <= Number(product.on_hand), 'INSUFFICIENT_STOCK', 409);
        if (delivered) { await moveStock(db, product.id, -delivered, 'sale', actor.id, { sale: item.id }); product.on_hand=Number(product.on_hand)-delivered; }
        if (delivered) await db.execute(`INSERT INTO order_delivery_items(batch_id,order_item_id,quantity,unit_price_snapshot)
          VALUES (?,?,?,?)`, [deliveryBatchId, item.id, delivered, price]);
        await db.execute(`UPDATE sales_order_items SET delivered_quantity=?,sku_snapshot=?,product_name_snapshot=?,unit_sale_price=?,unit_cost_snapshot=?,models_snapshot=CAST(? AS JSON) WHERE id=?`, [delivered, product.sku, item.custom_name || product.name, price, product.fixed_cost, JSON.stringify(jsonArray(product.models)), item.id]);
        total += BigInt(price) * BigInt(delivered);
        if (delivered < ordered) stillShort = true;
      }
      // A manual shortage can refer to goods outside the priced order lines.
      // Do not silently discard it just because every existing line was delivered.
      stillShort = stillShort || (order.fulfillment_status === 'short' && Boolean(order.missing_summary.trim()));
      total += BigInt(String(order.extra_cost));
      await db.execute(`UPDATE sales_orders SET status='confirmed',confirmed_by=?,confirmed_at=NOW(3),payment_method=?,total_amount=?,fulfillment_status=?,missing_summary=IF(?='short',missing_summary,''),version=version+1,updated_at=NOW(3) WHERE id=?`, [actor.id, payload.payment_method, total.toString(), stillShort ? 'short' : 'complete', stillShort ? 'short' : 'complete', order.id]);
      result = { id: order.id }; detail = order.id;

    } else if (action === 'deliver_order') {
      const order = await lockOrder(db, actor, payload.id);
      assert(order.status === 'confirmed' && order.fulfillment_status === 'short', 'INVALID_ORDER_STATE', 409);
      assert(Number(order.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
      const requested = Array.isArray(payload.items) ? payload.items : [];
      assert(requested.length >= 1 && requested.length <= 100);
      const ids = requested.map(item => uuid(item.order_item_id));
      assert(ids.length === new Set(ids).size);
      const [items] = await db.query(`SELECT * FROM sales_order_items WHERE order_id=? AND id IN (${ids.map(() => '?').join(',')}) ORDER BY product_id FOR UPDATE`, [order.id, ...ids]);
      assert(items.length === ids.length);
      const products = await lockProducts(db, items.map(item => item.product_id));
      const itemMap = new Map(items.map(item => [item.id, item]));
      const productMap = new Map(products.map(product => [product.id, product]));
      const [[sequenceRow]] = await db.execute('SELECT COALESCE(MAX(sequence_no),0)+1 sequence_no FROM order_delivery_batches WHERE order_id=?', [order.id]);
      const deliveryBatchId = newId();
      await db.execute(`INSERT INTO order_delivery_batches(id,order_id,sequence_no,delivery_kind,delivered_by)
        VALUES (?,?,?,'supplement',?)`, [deliveryBatchId, order.id, Number(sequenceRow.sequence_no), actor.id]);
      let addedTotal = 0n;
      for (const delivery of requested) {
        const item = itemMap.get(uuid(delivery.order_item_id));
        const product = productMap.get(item.product_id);
        const quantity = positiveInt(delivery.quantity);
        const remaining = Number(item.quantity) - Number(item.delivered_quantity);
        assert(quantity <= remaining, 'DELIVERY_EXCEEDS_ORDERED', 409);
        assert(quantity <= Number(product.on_hand), 'INSUFFICIENT_STOCK', 409);
        await moveStock(db, product.id, -quantity, 'sale', actor.id, { sale: item.id }); product.on_hand=Number(product.on_hand)-quantity;
        await db.execute(`INSERT INTO order_delivery_items(batch_id,order_item_id,quantity,unit_price_snapshot)
          VALUES (?,?,?,?)`, [deliveryBatchId, item.id, quantity, String(item.unit_sale_price)]);
        await db.execute('UPDATE sales_order_items SET delivered_quantity=delivered_quantity+? WHERE id=?', [quantity, item.id]);
        addedTotal += BigInt(String(item.unit_sale_price)) * BigInt(quantity);
      }
      const [[remainingRow]] = await db.execute('SELECT COUNT(*) count FROM sales_order_items WHERE order_id=? AND delivered_quantity<quantity', [order.id]);
      const complete = Number(remainingRow.count) === 0;
      const paymentAmount = moneyValue(payload.payment_amount ?? '0');
      const [[paid]] = await db.execute('SELECT COALESCE(SUM(amount),0) amount FROM sales_payments WHERE order_id=?', [order.id]);
      assert(BigInt(String(paid.amount)) + BigInt(paymentAmount) <= BigInt(String(order.total_amount)) + addedTotal, 'PAYMENT_EXCEEDS_DUE', 409);
      if (BigInt(paymentAmount) > 0n) {
        assert(['cash','transfer','cod','cod_transfer','cash_transfer'].includes(payload.payment_method));
        await db.execute('INSERT INTO sales_payments(id,order_id,amount,method,note,created_by) VALUES (?,?,?,?,?,?)', [newId(), order.id, paymentAmount, payload.payment_method, 'Thu tiền khi giao bổ sung', actor.id]);
        await audit(db, actor.id, 'order.payment', `${order.id} / ${paymentAmount}`);
      }
      await db.execute(`UPDATE sales_orders SET total_amount=total_amount+?,fulfillment_status=?,missing_summary=IF(?='complete','',missing_summary),version=version+1,updated_at=NOW(3) WHERE id=?`, [addedTotal.toString(), complete ? 'complete' : 'short', complete ? 'complete' : 'short', order.id]);
      result = { id: order.id, delivered_amount: addedTotal.toString(), complete }; detail = order.id;

    } else if (action === 'resolve_shortage') {
      const order = await lockOrder(db, actor, payload.id);
      assert(order.status === 'confirmed' && order.fulfillment_status === 'short', 'INVALID_ORDER_STATE', 409);
      assert(Number(order.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
      const [[remaining]] = await db.execute('SELECT COUNT(*) count FROM sales_order_items WHERE order_id=? AND delivered_quantity<quantity', [order.id]);
      assert(Number(remaining.count) === 0, 'DELIVERY_INCOMPLETE', 409);
      detail = `${order.id} / ${order.missing_summary}`;
      await db.execute("UPDATE sales_orders SET fulfillment_status='complete',missing_summary='',version=version+1,updated_at=NOW(3) WHERE id=?", [order.id]);
      result = { id: order.id };

    } else if (action === 'cancel_order') {
      const order = await lockOrder(db, actor, payload.id);
      assert(order.status === 'confirmed', 'INVALID_ORDER_STATE', 409);
      const [[returnCount]] = await db.execute('SELECT COUNT(*) count FROM sales_returns WHERE order_id=?', [order.id]);
      assert(!Number(returnCount.count), 'INVALID_ORDER_STATE', 409);
      const reason = cleanText(payload.reason, 1000, true);
      assert(['cash','transfer'].includes(payload.refund_method));
      const [items] = await db.execute('SELECT * FROM sales_order_items WHERE order_id=? ORDER BY product_id FOR UPDATE', [order.id]);
      await lockProducts(db, items.map(item => item.product_id));
      for (const item of items) if (Number(item.delivered_quantity)) await moveStock(db, item.product_id, Number(item.delivered_quantity), 'cancel', actor.id, { sale: item.id });
      await db.execute(`UPDATE sales_orders SET status='cancelled',cancelled_at=NOW(3),cancel_reason=?,cancel_refund_method=?,version=version+1,updated_at=NOW(3) WHERE id=?`, [reason, payload.refund_method, order.id]);
      result = { id: order.id }; detail = order.id;

    } else if (action === 'return_order') {
      const order = await lockOrder(db, actor, payload.id);
      assert(['confirmed','partially_returned'].includes(order.status), 'INVALID_ORDER_STATE', 409);
      const requestItems = Array.isArray(payload.items) ? payload.items : [];
      assert(requestItems.length >= 1 && requestItems.length <= 100);
      const reason = cleanText(payload.reason, 1000, true);
      assert(['cash','transfer'].includes(payload.refund_method));
      const ids = requestItems.map(item => uuid(item.order_item_id));
      assert(ids.length===new Set(ids).size);
      const [orderItems] = await db.query(`SELECT * FROM sales_order_items WHERE order_id=? AND id IN (${ids.map(() => '?').join(',')}) ORDER BY product_id FOR UPDATE`, [order.id, ...ids]);
      assert(orderItems.length === new Set(ids).size);
      await lockProducts(db, orderItems.map(item => item.product_id));
      const returnId = newId();
      await db.execute('INSERT INTO sales_returns(id,order_id,reason,refund_method,created_by) VALUES (?,?,?,?,?)', [returnId, order.id, reason, payload.refund_method, actor.id]);
      const itemMap = new Map(orderItems.map(item => [item.id, item]));
      let refund = 0n;
      for (const requestItem of requestItems) {
        const orderItem = itemMap.get(uuid(requestItem.order_item_id));
        const quantity = positiveInt(requestItem.quantity);
        const restock = positiveInt(requestItem.restock_quantity, true);
        assert(restock <= quantity);
        const [[returned]] = await db.execute('SELECT COALESCE(SUM(quantity),0) quantity FROM sales_return_items WHERE order_item_id=?', [orderItem.id]);
        assert(Number(returned.quantity) + quantity <= Number(orderItem.delivered_quantity), 'RETURN_EXCEEDS_SOLD', 409);
        const returnItemId = newId();
        const lineRefund = BigInt(String(orderItem.unit_sale_price)) * BigInt(quantity);
        await db.execute(`INSERT INTO sales_return_items(id,return_id,order_item_id,quantity,restock_quantity,refund_amount) VALUES (?,?,?,?,?,?)`, [returnItemId, returnId, orderItem.id, quantity, restock, lineRefund.toString()]);
        if (restock) await moveStock(db, orderItem.product_id, restock, 'return', actor.id, { ret: returnItemId });
        refund += lineRefund;
      }
      await db.execute('UPDATE sales_returns SET refund_amount=? WHERE id=?', [refund.toString(), returnId]);
      const [[counts]] = await db.execute(`SELECT (SELECT SUM(delivered_quantity) FROM sales_order_items WHERE order_id=?) sold,
        (SELECT COALESCE(SUM(ri.quantity),0) FROM sales_return_items ri JOIN sales_returns r ON r.id=ri.return_id WHERE r.order_id=?) returned`, [order.id, order.id]);
      const status = Number(counts.sold) === Number(counts.returned) ? 'returned' : 'partially_returned';
      await db.execute('UPDATE sales_orders SET status=?,version=version+1,updated_at=NOW(3) WHERE id=?', [status, order.id]);
      result = { id: order.id, return_id: returnId }; detail = order.id;

    } else if (action === 'product') {
      const sku = cleanText(payload.sku, 50, true).toUpperCase();
      const name = cleanText(payload.name, 200, true);
      assert(glassTypes.has(payload.glass_type));
      const models = [...new Set((Array.isArray(payload.models) ? payload.models : []).map(value => cleanText(value, 200)).filter(Boolean))];
      const brand = cleanText(payload.brand || 'other', 100, true);
      const salePrice = moneyValue(payload.sale_price);
      rejectCostWrite(actor,payload);
      let fixedCost = actor.role==='admin'?moneyValue(payload.fixed_cost):'0';
      const glassBrandId = payload.glass_brand_id ? uuid(payload.glass_brand_id) : null;
      const imagePath = payload.image_path ? cleanText(payload.image_path, 255, true) : null;
      let productId;
      if (!payload.id) {
        productId = newId();
        await db.execute(`INSERT INTO products(id,sku,name,glass_type,models,brand,glass_brand_id,image_path,sale_price,wholesale_price,fixed_cost,active)
          VALUES (?,?,?,?,CAST(? AS JSON),?,?,?,?,0,?,?)`, [productId, sku, name, payload.glass_type, JSON.stringify(models), brand, glassBrandId, imagePath, salePrice, fixedCost, payload.active !== false]);
      } else {
        productId = uuid(payload.id);
        const [[product]] = await db.execute('SELECT * FROM products WHERE id=? AND deleted_at IS NULL FOR UPDATE', [productId]);
        assert(product && Number(product.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
        if(actor.role!=='admin')fixedCost=String(product.fixed_cost);
        if (product.sku !== sku) {
          const [[usage]] = await db.execute(`SELECT (SELECT COUNT(*) FROM inventory_movements WHERE product_id=?) + (SELECT COUNT(*) FROM sales_order_items WHERE product_id=?) count`, [productId, productId]);
          assert(!Number(usage.count), 'SKU_IMMUTABLE', 409);
        }
        const priceChanged = String(product.sale_price) !== salePrice;
        await db.execute(`UPDATE products SET sku=?,name=?,glass_type=?,models=CAST(? AS JSON),brand=?,glass_brand_id=?,image_path=?,sale_price=?,fixed_cost=?,active=?,version=version+1,price_version=price_version+? WHERE id=?`, [sku, name, payload.glass_type, JSON.stringify(models), brand, glassBrandId, imagePath, salePrice, fixedCost, payload.active !== false, priceChanged ? 1 : 0, productId]);
      }
      if(payload.wholesale_price!==undefined){
        const wholesale=moneyValue(payload.wholesale_price);
        await db.execute('UPDATE products SET price_version=price_version+IF(wholesale_price<>?,1,0),wholesale_price=? WHERE id=?',[wholesale,wholesale,productId]);
      }
      result = { id: productId }; detail = sku;

    } else if (action === 'import_products') {
      result = await require('./import-products.cjs').importProducts(db, payload, actor);
      detail = `Excel: ${result.created} mới, ${result.updated} cập nhật`;
    } else if (action === 'inventory') {
      assert(['opening','receipt','issue','damage','adjustment'].includes(payload.type));
      const reason = cleanText(payload.reason, 1000, true);
      const items = Array.isArray(payload.items) ? payload.items : [];
      assert(items.length >= 1 && items.length <= 100);
      // Resolve Excel SKUs inside this transaction, never as separate product writes.
      const resolved = [];
      const seenSkus = new Set();
      for (const item of [...items].sort((a,b) => String(a.sku || a.product_id).localeCompare(String(b.sku || b.product_id)))) {
        positiveInt(item.quantity, payload.type === 'adjustment');
        rejectCostWrite(actor,item);
        if (payload.type === 'receipt' && actor.role==='admin') moneyValue(item.purchase_price);
        if (item.sku != null) {
          assert(payload.type === 'receipt' && item.product_id == null);
          const sku = cleanText(item.sku, 50, true).toUpperCase();
          assert(sku.length <= 50 && !seenSkus.has(sku));
          seenSkus.add(sku);
          const createdId = newId();
          await db.execute(`INSERT INTO products(id,sku,name,glass_type,models,brand,sale_price,wholesale_price,fixed_cost)
            VALUES (?,?,?,'other',JSON_ARRAY(),'other',0,0,?) ON DUPLICATE KEY UPDATE id=id`, [createdId,sku,sku,actor.role==='admin'?moneyValue(item.purchase_price):'0']);
          const [[product]] = await db.execute('SELECT id,deleted_at FROM products WHERE sku=? FOR UPDATE', [sku]);
          assert(product && !product.deleted_at, 'PRODUCT_NOT_FOUND', 409);
          resolved.push({...item,product_id:product.id});
        } else resolved.push(item);
      }
      assert(new Set(resolved.map(item => uuid(item.product_id))).size === resolved.length);
      const products = await lockProducts(db, resolved.map(item => item.product_id));
      const productMap = new Map(products.map(product => [product.id, product]));
      const documentId = newId();
      await db.execute('INSERT INTO inventory_documents(id,type,reason,created_by) VALUES (?,?,?,?)', [documentId, payload.type, reason, actor.id]);
      for (const item of [...resolved].sort((a,b) => String(a.product_id).localeCompare(String(b.product_id)))) {
        const product = productMap.get(uuid(item.product_id));
        const quantity = positiveInt(item.quantity, payload.type === 'adjustment');
        if (payload.type === 'opening') {
          const [[moves]] = await db.execute('SELECT COUNT(*) count FROM inventory_movements WHERE product_id=?', [product.id]);
          assert(!Number(moves.count), 'OPENING_EXISTS', 409);
        }
        if (payload.type === 'adjustment') assert(Number(product.stock_version) === Number(item.stock_version), 'VERSION_CONFLICT', 409);
        const delta = payload.type === 'adjustment' ? quantity - Number(product.on_hand) : ['issue','damage'].includes(payload.type) ? -quantity : quantity;
        if (!delta) continue;
        const purchasePrice = payload.type === 'receipt' && actor.role==='admin' ? moneyValue(item.purchase_price) : null;
        const lineId = newId();
        await db.execute(`INSERT INTO inventory_document_items(id,document_id,product_id,quantity_delta,unit_purchase_price,fixed_cost_snapshot,sku_snapshot,name_snapshot) VALUES (?,?,?,?,?,?,?,?)`, [lineId, documentId, product.id, delta, purchasePrice, product.fixed_cost, product.sku, product.name]);
        await moveStock(db, product.id, delta, payload.type, actor.id, { doc: lineId });
      }
      result = { id: documentId }; detail = `${payload.type}: ${reason}`;

    } else if (action === 'glass_brand') {
      const name = cleanText(payload.name, 100, true).replace(/\s+/g, ' ');
      const id = newId();
      await db.execute('INSERT INTO glass_brands(id,name) VALUES (?,?)', [id, name]);
      result = { id }; detail = name;

    } else if (action === 'exchange') {
      const returnId = uuid(payload.return_id);
      const [[returnRow]] = await db.execute('SELECT * FROM sales_returns WHERE id=? FOR UPDATE', [returnId]);
      assert(returnRow);
      const [[existing]] = await db.execute('SELECT id FROM sales_orders WHERE exchange_return_id=? FOR UPDATE', [returnId]);
      let orderId = existing?.id;
      if (!orderId) {
        orderId = newId();
        await db.execute(`INSERT INTO sales_orders(id,created_by,sales_user_id,exchange_return_id,note) VALUES (?,?,?,?,?)`, [orderId, actor.id, actor.id, returnId, `Đổi hàng từ phiếu trả ${returnId}`]);
      }
      result = { id: orderId }; detail = orderId;

    } else if (action === 'staff_state') {
      const id = uuid(payload.id);
      const [[user]] = await db.execute("SELECT * FROM app_users WHERE id=? AND role='staff' AND deleted_at IS NULL FOR UPDATE", [id]);
      assert(user, 'FORBIDDEN', 403);
      const displayName = payload.display_name == null ? user.display_name : cleanText(payload.display_name, 100, true);
      const active = payload.active == null ? Boolean(user.active) : Boolean(payload.active);
      await db.execute('UPDATE app_users SET display_name=?,active=?,session_token_hash=IF(?=FALSE,NULL,session_token_hash),session_device_id=IF(?=FALSE,NULL,session_device_id),session_last_seen=IF(?=FALSE,NULL,session_last_seen) WHERE id=?', [displayName, active, active, active, active, id]);
      result = { id }; detail = id;
    } else throw appError('VALIDATION_ERROR');

    await audit(db, actor.id, action, detail);
    await db.execute('UPDATE mutation_requests SET result=CAST(? AS JSON) WHERE actor_id=? AND request_key=?', [JSON.stringify(result), actor.id, key]);
    return result;
  });
}

module.exports = { mutate, lockOrder, lockProducts };
