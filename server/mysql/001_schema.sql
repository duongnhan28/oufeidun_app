SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_users (
  id CHAR(36) PRIMARY KEY,
  login_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','staff') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  session_device_id VARCHAR(100) NULL,
  session_token_hash CHAR(64) NULL,
  session_last_seen DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT app_users_display_name_check CHECK (CHAR_LENGTH(TRIM(display_name)) BETWEEN 1 AND 100),
  UNIQUE KEY app_users_login_unique (login_name),
  KEY app_users_session_token (session_token_hash)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS glass_brands (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY glass_brands_name_unique (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  glass_type ENUM('clear','privacy','matte','other','full_border','premium_borderless') NOT NULL,
  models JSON NOT NULL,
  brand VARCHAR(100) NOT NULL DEFAULT 'other',
  glass_brand_id CHAR(36) NULL,
  image_path VARCHAR(255) NULL,
  sale_price DECIMAL(18,0) NOT NULL DEFAULT 0,
  wholesale_price DECIMAL(18,0) NOT NULL DEFAULT 0,
  fixed_cost DECIMAL(18,0) NOT NULL DEFAULT 0,
  on_hand INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  price_version INT NOT NULL DEFAULT 1,
  stock_version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT products_price_check CHECK (sale_price>=0 AND wholesale_price>=0 AND fixed_cost>=0),
  CONSTRAINT products_stock_check CHECK (on_hand>=0),
  UNIQUE KEY products_sku_unique (sku),
  KEY products_brand (brand),
  KEY products_glass_type (glass_type),
  CONSTRAINT products_glass_brand_fk FOREIGN KEY (glass_brand_id) REFERENCES glass_brands(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) PRIMARY KEY,
  customer_type ENUM('retail','wholesale') NOT NULL DEFAULT 'retail',
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(500) NOT NULL DEFAULT '',
  note VARCHAR(1000) NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY customers_phone_unique (phone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_orders (
  id CHAR(36) PRIMARY KEY,
  order_no BIGINT NOT NULL AUTO_INCREMENT,
  status ENUM('draft','confirmed','partially_returned','returned','cancelled','deleted') NOT NULL DEFAULT 'draft',
  created_by CHAR(36) NOT NULL,
  confirmed_by CHAR(36) NULL,
  sales_user_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(200) NOT NULL DEFAULT '',
  customer_phone VARCHAR(30) NOT NULL DEFAULT '',
  customer_address VARCHAR(500) NOT NULL DEFAULT '',
  customer_type ENUM('retail','wholesale') NOT NULL DEFAULT 'retail',
  fulfillment_status ENUM('complete','short') NOT NULL DEFAULT 'complete',
  missing_summary VARCHAR(1000) NOT NULL DEFAULT '',
  note VARCHAR(1000) NOT NULL DEFAULT '',
  payment_method ENUM('cash','transfer','cod','cod_transfer','cash_transfer') NULL,
  total_amount DECIMAL(18,0) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  exchange_return_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  confirmed_at DATETIME(3) NULL,
  cancelled_at DATETIME(3) NULL,
  cancel_reason VARCHAR(1000) NULL,
  cancel_refund_method ENUM('cash','transfer') NULL,
  UNIQUE KEY sales_orders_order_no_unique (order_no),
  KEY sales_orders_owner (created_by,status,updated_at),
  KEY sales_orders_confirmed (confirmed_at),
  KEY sales_orders_sales_user (sales_user_id,created_at),
  CONSTRAINT sales_orders_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id),
  CONSTRAINT sales_orders_confirmed_by_fk FOREIGN KEY (confirmed_by) REFERENCES app_users(id),
  CONSTRAINT sales_orders_sales_user_fk FOREIGN KEY (sales_user_id) REFERENCES app_users(id),
  CONSTRAINT sales_orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT NOT NULL,
  delivered_quantity INT NOT NULL DEFAULT 0,
  custom_name VARCHAR(200) NULL,
  unit_sale_price DECIMAL(18,0) NOT NULL,
  quoted_price_version INT NOT NULL,
  sku_snapshot VARCHAR(50) NULL,
  product_name_snapshot VARCHAR(200) NULL,
  item_kind ENUM('sale','gift','sample') NOT NULL DEFAULT 'sale',
  item_note VARCHAR(500) NOT NULL DEFAULT '',
  unit_cost_snapshot DECIMAL(18,0) NULL,
  CONSTRAINT sales_order_items_quantity_check CHECK (quantity>0 AND quantity<=1000000),
  CONSTRAINT sales_order_items_delivered_check CHECK (delivered_quantity>=0 AND delivered_quantity<=quantity),
  CONSTRAINT sales_order_items_price_check CHECK (unit_sale_price>=0 AND (unit_cost_snapshot IS NULL OR unit_cost_snapshot>=0)),
  UNIQUE KEY sales_order_items_order_product (order_id,product_id),
  KEY sales_order_items_product (product_id),
  CONSTRAINT sales_order_items_order_fk FOREIGN KEY (order_id) REFERENCES sales_orders(id),
  CONSTRAINT sales_order_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_returns (
  id CHAR(36) PRIMARY KEY,
  return_no BIGINT NOT NULL AUTO_INCREMENT,
  order_id CHAR(36) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  refund_amount DECIMAL(18,0) NOT NULL DEFAULT 0,
  refund_method ENUM('cash','transfer') NOT NULL,
  created_by CHAR(36) NOT NULL,
  posted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT sales_returns_refund_check CHECK (refund_amount>=0),
  UNIQUE KEY sales_returns_return_no_unique (return_no),
  KEY sales_returns_order (order_id),
  CONSTRAINT sales_returns_order_fk FOREIGN KEY (order_id) REFERENCES sales_orders(id),
  CONSTRAINT sales_returns_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_return_items (
  id CHAR(36) PRIMARY KEY,
  return_id CHAR(36) NOT NULL,
  order_item_id CHAR(36) NOT NULL,
  quantity INT NOT NULL,
  restock_quantity INT NOT NULL,
  refund_amount DECIMAL(18,0) NOT NULL,
  CONSTRAINT sales_return_items_quantity_check CHECK (quantity>0 AND restock_quantity>=0 AND restock_quantity<=quantity),
  UNIQUE KEY sales_return_items_return_order_item (return_id,order_item_id),
  KEY sales_return_items_order_item (order_item_id),
  CONSTRAINT sales_return_items_return_fk FOREIGN KEY (return_id) REFERENCES sales_returns(id),
  CONSTRAINT sales_return_items_order_item_fk FOREIGN KEY (order_item_id) REFERENCES sales_order_items(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_payments (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  amount DECIMAL(18,0) NOT NULL,
  method ENUM('cash','transfer','cod','cod_transfer','cash_transfer') NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_by CHAR(36) NOT NULL,
  paid_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT sales_payments_amount_check CHECK (amount>0),
  KEY sales_payments_order (order_id,paid_at),
  CONSTRAINT sales_payments_order_fk FOREIGN KEY (order_id) REFERENCES sales_orders(id),
  CONSTRAINT sales_payments_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_documents (
  id CHAR(36) PRIMARY KEY,
  document_no BIGINT NOT NULL AUTO_INCREMENT,
  type ENUM('opening','receipt','issue','damage','adjustment') NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_by CHAR(36) NOT NULL,
  posted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY inventory_documents_no_unique (document_no),
  CONSTRAINT inventory_documents_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_document_items (
  id CHAR(36) PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity_delta INT NOT NULL,
  unit_purchase_price DECIMAL(18,0) NULL,
  fixed_cost_snapshot DECIMAL(18,0) NOT NULL,
  sku_snapshot VARCHAR(50) NOT NULL,
  name_snapshot VARCHAR(200) NOT NULL,
  CONSTRAINT inventory_document_items_quantity_check CHECK (quantity_delta<>0),
  UNIQUE KEY inventory_document_items_doc_product (document_id,product_id),
  CONSTRAINT inventory_document_items_doc_fk FOREIGN KEY (document_id) REFERENCES inventory_documents(id),
  CONSTRAINT inventory_document_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  movement_type ENUM('opening','receipt','issue','damage','adjustment','sale','cancel','return') NOT NULL,
  quantity_delta INT NOT NULL,
  balance_after INT NOT NULL,
  product_version_after INT NOT NULL,
  inventory_document_item_id CHAR(36) NULL,
  sale_order_item_id CHAR(36) NULL,
  return_item_id CHAR(36) NULL,
  actor_id CHAR(36) NOT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT inventory_movements_balance_check CHECK (quantity_delta<>0 AND balance_after>=0),
  UNIQUE KEY inventory_movements_product_version (product_id,product_version_after),
  KEY inventory_movements_product_time (product_id,occurred_at),
  CONSTRAINT inventory_movements_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT inventory_movements_doc_item_fk FOREIGN KEY (inventory_document_item_id) REFERENCES inventory_document_items(id),
  CONSTRAINT inventory_movements_sale_item_fk FOREIGN KEY (sale_order_item_id) REFERENCES sales_order_items(id),
  CONSTRAINT inventory_movements_return_item_fk FOREIGN KEY (return_item_id) REFERENCES sales_return_items(id),
  CONSTRAINT inventory_movements_actor_fk FOREIGN KEY (actor_id) REFERENCES app_users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  actor_id CHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  detail TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY audit_logs_time (created_at),
  CONSTRAINT audit_logs_actor_fk FOREIGN KEY (actor_id) REFERENCES app_users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mutation_requests (
  actor_id CHAR(36) NOT NULL,
  request_key CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  result JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY(actor_id,request_key),
  CONSTRAINT mutation_requests_actor_fk FOREIGN KEY (actor_id) REFERENCES app_users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO schema_migrations(version) VALUES ('001_schema');
