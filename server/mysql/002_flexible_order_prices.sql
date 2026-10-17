CREATE TABLE IF NOT EXISTS customer_product_prices (
  customer_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  unit_price DECIMAL(18,0) NOT NULL,
  created_by CHAR(36) NOT NULL,
  updated_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (customer_id,product_id),
  KEY customer_product_prices_product (product_id),
  CONSTRAINT customer_product_prices_amount_check CHECK (unit_price>=0),
  CONSTRAINT customer_product_prices_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT customer_product_prices_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT customer_product_prices_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id),
  CONSTRAINT customer_product_prices_updated_by_fk FOREIGN KEY (updated_by) REFERENCES app_users(id)
) ENGINE=InnoDB;

ALTER TABLE sales_order_items
  ADD COLUMN price_overridden BOOLEAN NOT NULL DEFAULT FALSE AFTER unit_sale_price;

ALTER TABLE sales_order_items
  ADD COLUMN price_source ENUM('retail_default','wholesale_default','customer_saved','manual','free_item') NOT NULL DEFAULT 'retail_default' AFTER price_overridden;

INSERT IGNORE INTO schema_migrations(version) VALUES ('002_flexible_order_prices');
