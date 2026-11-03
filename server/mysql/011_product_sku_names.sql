CREATE TABLE IF NOT EXISTS product_sku_names (
 sku VARCHAR(50) NOT NULL PRIMARY KEY,
 product_id CHAR(36) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 KEY product_sku_names_product(product_id),
 CONSTRAINT product_sku_names_product_fk FOREIGN KEY(product_id) REFERENCES products(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS product_sku_renames (
 id CHAR(36) NOT NULL PRIMARY KEY,
 product_id CHAR(36) NOT NULL,
 old_sku VARCHAR(50) NOT NULL,
 new_sku VARCHAR(50) NOT NULL,
 actor_id CHAR(36) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 KEY product_sku_renames_product(product_id,created_at),
 CONSTRAINT product_sku_renames_product_fk FOREIGN KEY(product_id) REFERENCES products(id),
 CONSTRAINT product_sku_renames_actor_fk FOREIGN KEY(actor_id) REFERENCES app_users(id)
) ENGINE=InnoDB;
INSERT IGNORE INTO product_sku_names(sku,product_id) SELECT sku,id FROM products;
UPDATE sales_order_items i JOIN products p ON p.id=i.product_id SET i.sku_snapshot=p.sku WHERE i.sku_snapshot IS NULL;
INSERT IGNORE INTO schema_migrations(version) VALUES ('011_product_sku_names');
