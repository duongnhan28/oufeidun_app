ALTER TABLE sales_orders ADD COLUMN ordered_at DATETIME(3) NULL;
ALTER TABLE sales_orders ADD COLUMN extra_cost DECIMAL(18,0) NOT NULL DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN extra_cost_note VARCHAR(1000) NOT NULL DEFAULT '';
ALTER TABLE sales_order_items ADD COLUMN models_snapshot JSON NULL;
UPDATE sales_orders SET ordered_at=COALESCE(confirmed_at,created_at) WHERE ordered_at IS NULL;
INSERT IGNORE INTO schema_migrations(version) VALUES ('006_order_details');
