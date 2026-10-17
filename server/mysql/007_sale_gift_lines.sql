ALTER TABLE sales_order_items ADD UNIQUE KEY sales_order_items_order_product_kind(order_id,product_id,item_kind);
ALTER TABLE sales_order_items DROP INDEX sales_order_items_order_product;
INSERT IGNORE INTO schema_migrations(version) VALUES ('007_sale_gift_lines');
