const { pool, appError, assert, uuid, newId, cleanText, moneyValue, passwordHash, transaction, audit } = require('./core.cjs');
const withDb = (db, fn) => db ? fn(db) : transaction(fn);
const {requireOperator,rejectCostWrite} = require('./permissions.cjs');
const { lockOrder } = require('./mutations.cjs');

async function saveOrderFeatures(actor, payload, connection) {
  return withDb(connection, async db => {
    const order = await lockOrder(db, actor, payload.order_id);
    if (payload.action === 'payment') {
      assert(['confirmed','partially_returned','returned'].includes(order.status), 'INVALID_ORDER_STATE', 409);
      assert(['cash','transfer','cod','cod_transfer','cash_transfer'].includes(payload.method));
      const amount = moneyValue(payload.amount);
      assert(BigInt(amount) > 0n);
      const note = cleanText(payload.note, 500);
      const [[paid]] = await db.execute('SELECT COALESCE(SUM(amount),0) amount FROM sales_payments WHERE order_id=? FOR UPDATE', [order.id]);
      assert(BigInt(String(paid.amount)) + BigInt(amount) <= BigInt(String(order.total_amount)), 'PAYMENT_EXCEEDS_DUE', 409);
      const id = newId();
      await db.execute('INSERT INTO sales_payments(id,order_id,amount,method,note,created_by) VALUES (?,?,?,?,?,?)', [id, order.id, amount, payload.method, note, actor.id]);
      await db.execute('UPDATE sales_orders SET version=version+1,updated_at=NOW(3) WHERE id=?', [order.id]);
      await audit(db, actor.id, 'order.payment', `${order.id} / ${amount}`);
      return { id };
    }
    assert(payload.action === 'save' && order.status === 'draft', 'INVALID_ORDER_STATE', 409);
    const customerType = payload.customer_type || 'retail';
    assert(['retail','wholesale'].includes(customerType));
    const address = cleanText(payload.customer_address, 500);
    const items = Array.isArray(payload.items) ? payload.items : [];
    assert(items.length >= 1 && items.length <= 100);
    await db.execute('UPDATE sales_orders SET customer_address=?,customer_type=? WHERE id=?', [address, customerType, order.id]);
    for (const item of items) {
      const productId = uuid(item.product_id);
      const itemKind = item.item_kind || 'sale';
      let [[line]] = await db.execute('SELECT * FROM sales_order_items WHERE order_id=? AND product_id=? AND item_kind=? FOR UPDATE', [order.id, productId, itemKind]);
      if (!line) { const [matches] = await db.execute('SELECT * FROM sales_order_items WHERE order_id=? AND product_id=? FOR UPDATE', [order.id,productId]); if(matches.length===1)line=matches[0]; }
      assert(line);
      assert(['sale','gift','sample'].includes(itemKind));
      const note = cleanText(item.item_note, 500);
      const [[product]] = await db.execute('SELECT * FROM products WHERE id=? AND deleted_at IS NULL', [productId]);
      assert(product, 'PRODUCT_NOT_FOUND', 404);
      let suggestedPrice = String(product.sale_price), suggestedSource = 'retail_default';
      if (customerType === 'wholesale') {
        suggestedPrice = String(product.wholesale_price);
        suggestedSource = 'wholesale_default';
        if (order.customer_id) {
          const [[savedPrice]] = await db.execute('SELECT unit_price FROM customer_product_prices WHERE customer_id=? AND product_id=?', [order.customer_id, productId]);
          if (savedPrice) {
            suggestedPrice = String(savedPrice.unit_price);
            suggestedSource = 'customer_saved';
          }
        }
      }
      const overridden = itemKind === 'sale' && item.price_overridden === true;
      const price = itemKind === 'sale' ? (overridden ? moneyValue(item.unit_sale_price) : suggestedPrice) : '0';
      if (itemKind === 'sale' && price === '0') assert(item.zero_price_confirm === true, 'ZERO_PRICE_CONFIRM_REQUIRED', 409);
      const priceSource = itemKind === 'sale' ? (overridden ? 'manual' : suggestedSource) : 'free_item';
      if (String(line.unit_sale_price) !== price || Boolean(line.price_overridden) !== overridden)
        await audit(db, actor.id, 'order.item_price.update', `${order.id} / ${product.sku}: ${line.unit_sale_price} -> ${price}`);
      await db.execute('UPDATE sales_order_items SET unit_sale_price=?,price_overridden=?,price_source=?,quoted_price_version=?,item_kind=?,item_note=? WHERE id=?', [price, overridden, priceSource, product.price_version, itemKind, note, line.id]);
      if (item.save_customer_price === true) {
        assert(customerType === 'wholesale' && order.customer_id && itemKind === 'sale', 'CUSTOMER_PRICE_REQUIRES_WHOLESALE', 409);
        await db.execute(`INSERT INTO customer_product_prices(customer_id,product_id,unit_price,created_by,updated_by)
          VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE unit_price=VALUES(unit_price),updated_by=VALUES(updated_by),updated_at=NOW(3)`, [order.customer_id, productId, price, actor.id, actor.id]);
        await audit(db, actor.id, 'customer.price.save', `${order.customer_id} / ${product.sku}: ${price}`);
      }
    }
    const [[total]] = await db.execute('SELECT COALESCE(SUM(quantity*unit_sale_price),0) amount FROM sales_order_items WHERE order_id=?', [order.id]);
    await db.execute('UPDATE sales_orders SET total_amount=?+extra_cost,version=version+1,updated_at=NOW(3) WHERE id=?', [String(total.amount), order.id]);
    await audit(db, actor.id, 'order.features.update', order.id);
    return { id: order.id };
  });
}

async function saveCustomer(actor, payload, connection) {
  return withDb(connection, async db => {
    if (payload.action === 'delete') {
      requireOperator(actor);
      const id = uuid(payload.id);
      const [[row]] = await db.execute('SELECT * FROM customers WHERE id=? FOR UPDATE', [id]);
      assert(row);
      await db.execute('UPDATE customers SET active=FALSE WHERE id=?', [id]);
      await audit(db, actor.id, 'customer.delete', `${row.name} / ${row.phone}`);
      return { id };
    }
    const name = cleanText(payload.name, 200, true);
    const phone = cleanText(payload.phone, 30, true);
    const type = payload.customer_type;
    assert(['retail','wholesale'].includes(type));
    const address = cleanText(payload.address, 500);
    const note = cleanText(payload.note, 1000);
    const id = payload.id ? uuid(payload.id) : newId();
    await db.execute(`INSERT INTO customers(id,customer_type,name,phone,address,note,active) VALUES (?,?,?,?,?,?,TRUE)
      ON DUPLICATE KEY UPDATE customer_type=VALUES(customer_type),name=VALUES(name),phone=VALUES(phone),address=VALUES(address),note=VALUES(note),active=TRUE`, [id, type, name, phone, address, note]);
    const [[saved]] = await db.execute('SELECT id FROM customers WHERE phone=?', [phone]);
    await audit(db, actor.id, 'customer.save', `${name} / ${phone}`);
    return { id: saved.id };
  });
}

async function saveOrderBusiness(actor, payload, connection) {
  return withDb(connection, async db => {
    const order = await lockOrder(db, actor, payload.order_id);
    const orderCode = cleanText(payload.order_code ?? order.order_code, 50, true);
    const customerId = payload.customer_id ? uuid(payload.customer_id) : null;
    const salesUserId = payload.sales_user_id ? uuid(payload.sales_user_id) : actor.id;
    const [[sales]] = await db.execute('SELECT id FROM app_users WHERE id=? AND active=TRUE AND deleted_at IS NULL', [salesUserId]);
    assert(sales, 'INVALID_SALES_USER');
    const fulfillment = payload.fulfillment_status || 'complete';
    assert(['complete','short'].includes(fulfillment));
    const missing = cleanText(payload.missing_summary, 1000);
    assert(fulfillment !== 'short' || missing.length > 0, 'MISSING_SUMMARY_REQUIRED', 409);
    await db.execute('UPDATE sales_orders SET order_code=?,customer_id=?,sales_user_id=?,fulfillment_status=?,missing_summary=?,updated_at=NOW(3) WHERE id=?', [orderCode, customerId, salesUserId, fulfillment, fulfillment === 'short' ? missing : '', order.id]);
    await audit(db, actor.id, 'order.business.update', order.id);
    return { id: order.id };
  });
}

async function setWholesalePrice(actor, payload) {
  requireOperator(actor);
  const id = uuid(payload.product_id);
  const price = moneyValue(payload.wholesale_price);
  return transaction(async db => {
    const [result] = await db.execute('UPDATE products SET price_version=price_version+IF(wholesale_price<>?,1,0),wholesale_price=?,version=version+1 WHERE id=? AND deleted_at IS NULL', [price, price, id]);
    assert(result.affectedRows, 'PRODUCT_NOT_FOUND', 404);
    await audit(db, actor.id, 'product.wholesale_price', id);
    return { id };
  });
}

async function setBulkPrice(actor, payload) {
  requireOperator(actor);
  rejectCostWrite(actor,payload);
  assert(['clear','privacy','matte','other','full_border','premium_borderless'].includes(payload.glass_type));
  if (Object.hasOwn(payload, 'price_field')) {
    assert(['sale_price','wholesale_price'].includes(payload.price_field));
    const price = moneyValue(payload.unit_price);
    // The field is allowlisted above. Never write cost or the other price tier.
    const field = payload.price_field;
    return transaction(async db => {
      const [result] = await db.execute(`UPDATE products SET
        price_version=price_version+IF(${field}<>?,1,0),version=version+1,${field}=?
        WHERE (glass_type=? OR (? IN ('clear','full_border') AND glass_type IN ('clear','full_border'))) AND active=TRUE AND deleted_at IS NULL`, [price,price,payload.glass_type,payload.glass_type]);
      await audit(db, actor.id, 'product.bulk_price', `${payload.glass_type}: ${field}=${price}; ${result.affectedRows} mã`);
      return { updated: result.affectedRows };
    });
  }
  const retail = moneyValue(payload.sale_price), wholesale = moneyValue(payload.wholesale_price), cost = actor.role==='admin'?moneyValue(payload.fixed_cost):'0';
  return transaction(async db => {
    const [result] = await db.execute(`UPDATE products SET
      price_version=price_version+IF(sale_price<>? OR wholesale_price<>?,1,0),version=version+1,
      fixed_cost=IF(?,?,fixed_cost),sale_price=?,wholesale_price=?
      WHERE (glass_type=? OR (? IN ('clear','full_border') AND glass_type IN ('clear','full_border'))) AND active=TRUE AND deleted_at IS NULL`, [retail, wholesale,actor.role==='admin',cost,retail,wholesale, payload.glass_type,payload.glass_type]);
    await audit(db, actor.id, 'product.bulk_price', `${payload.glass_type}: ${result.affectedRows} mã`);
    return { updated: result.affectedRows };
  });
}

async function deleteProduct(actor, payload) {
  requireOperator(actor);
  return transaction(async db => {
    const id = uuid(payload.id);
    const [[product]] = await db.execute('SELECT * FROM products WHERE id=? AND deleted_at IS NULL FOR UPDATE', [id]);
    assert(product, 'PRODUCT_NOT_FOUND', 404);
    assert(Number(product.version) === Number(payload.version), 'VERSION_CONFLICT', 409);
    assert(Number(product.on_hand) === 0, 'PRODUCT_HAS_STOCK', 409);
    const [[draft]] = await db.execute(`SELECT COUNT(*) count FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id WHERE i.product_id=? AND o.status='draft'`, [id]);
    assert(!Number(draft.count), 'PRODUCT_IN_USE', 409);
    await db.execute('UPDATE products SET active=FALSE,deleted_at=NOW(3),version=version+1 WHERE id=?', [id]);
    await audit(db, actor.id, 'delete_product', product.sku);
    return { id };
  });
}

async function manageStaff(actor, payload) {
  requireOperator(actor);
  return transaction(async db => {
    if (payload.action === 'create') {
      const displayName = cleanText(payload.display_name, 100, true);
      const loginName = cleanText(payload.login_name, 100, true).toLowerCase();
      assert(/^[a-z0-9._-]{3,100}$/.test(loginName));
      const id = newId();
      try {
        await db.execute("INSERT INTO app_users(id,login_name,display_name,password_hash,role,active) VALUES (?,?,?,?, 'staff',TRUE)", [id, loginName, displayName, passwordHash(String(payload.password || ''))]);
      } catch (error) { if (error.code === 'ER_DUP_ENTRY') throw appError('ACCOUNT_EXISTS', 409); throw error; }
      await audit(db, actor.id, 'staff.create', displayName);
      return { id };
    }
    if (payload.action === 'profile') {
      const displayName = cleanText(payload.display_name, 100, true);
      await db.execute('UPDATE app_users SET display_name=? WHERE id=?', [displayName, actor.id]);
      await audit(db, actor.id, 'staff.profile', displayName);
      return { id: actor.id, self: true };
    }
    const id = uuid(payload.id);
    const [[target]] = await db.execute('SELECT * FROM app_users WHERE id=? AND deleted_at IS NULL FOR UPDATE', [id]);
    assert(target, 'ACCOUNT_NOT_FOUND', 404);
    assert(actor.role==='admin' || target.role==='staff', 'FORBIDDEN',403);
    if (payload.action === 'reset') {
      await db.execute('UPDATE app_users SET password_hash=?,session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=?', [passwordHash(String(payload.password || '')), id]);
      await audit(db, actor.id, 'staff.password.reset', id);
      return { id, self: id === actor.id };
    }
    assert(payload.action === 'delete' && target.role === 'staff', 'FORBIDDEN', 403);
    await db.execute('UPDATE app_users SET active=FALSE,deleted_at=NOW(3),session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=?', [id]);
    await audit(db, actor.id, 'staff.delete', id);
    return { id };
  });
}

module.exports = { saveOrderFeatures, saveCustomer, saveOrderBusiness, setWholesalePrice, setBulkPrice, deleteProduct, manageStaff };
