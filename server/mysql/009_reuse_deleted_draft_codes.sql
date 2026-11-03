-- Keep the original code on deleted drafts for audit, reserve only live order codes.
ALTER TABLE sales_orders
  ADD COLUMN active_order_code VARCHAR(50) GENERATED ALWAYS AS (CASE WHEN status <> 'deleted' THEN order_code ELSE NULL END) STORED;

ALTER TABLE sales_orders
  ADD UNIQUE KEY sales_orders_active_order_code_unique (active_order_code);

ALTER TABLE sales_orders DROP INDEX sales_orders_order_code_unique;

INSERT IGNORE INTO schema_migrations(version) VALUES ('009_reuse_deleted_draft_codes');
