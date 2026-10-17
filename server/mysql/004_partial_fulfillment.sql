ALTER TABLE sales_order_items
  ADD COLUMN delivered_quantity INT NOT NULL DEFAULT 0 AFTER quantity;

UPDATE sales_order_items i
JOIN sales_orders o ON o.id=i.order_id
SET i.delivered_quantity=i.quantity
WHERE o.status IN ('confirmed','partially_returned','returned','cancelled');

ALTER TABLE sales_order_items
  ADD CONSTRAINT sales_order_items_delivered_check
  CHECK (delivered_quantity>=0 AND delivered_quantity<=quantity);

INSERT IGNORE INTO schema_migrations(version) VALUES ('004_partial_fulfillment');
