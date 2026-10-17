ALTER TABLE sales_orders
  ADD COLUMN order_code VARCHAR(50) NULL AFTER order_no;

UPDATE sales_orders
SET order_code=CONCAT('DH-',LPAD(order_no,5,'0'))
WHERE order_code IS NULL;

ALTER TABLE sales_orders
  ADD UNIQUE KEY sales_orders_order_code_unique (order_code);

INSERT IGNORE INTO schema_migrations(version) VALUES ('003_manual_order_code');
