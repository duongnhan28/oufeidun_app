-- Existing lines retain their previous stable ID order; new saves record selection order.
ALTER TABLE sales_order_items ADD COLUMN line_position INT UNSIGNED NOT NULL DEFAULT 0;
CREATE INDEX sales_order_items_position ON sales_order_items(order_id,line_position,id);
INSERT IGNORE INTO schema_migrations(version) VALUES ('008_order_line_position');
