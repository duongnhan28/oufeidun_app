CREATE TABLE IF NOT EXISTS order_delivery_batches (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  sequence_no INT NOT NULL,
  delivery_kind ENUM('initial','supplement') NOT NULL,
  delivered_by CHAR(36) NOT NULL,
  delivered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY order_delivery_batches_sequence (order_id,sequence_no),
  KEY order_delivery_batches_order_time (order_id,delivered_at),
  CONSTRAINT order_delivery_batches_order_fk FOREIGN KEY (order_id) REFERENCES sales_orders(id),
  CONSTRAINT order_delivery_batches_actor_fk FOREIGN KEY (delivered_by) REFERENCES app_users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_delivery_items (
  batch_id CHAR(36) NOT NULL,
  order_item_id CHAR(36) NOT NULL,
  quantity INT NOT NULL,
  unit_price_snapshot DECIMAL(18,0) NOT NULL,
  PRIMARY KEY (batch_id,order_item_id),
  CONSTRAINT order_delivery_items_quantity_check CHECK (quantity>0),
  CONSTRAINT order_delivery_items_batch_fk FOREIGN KEY (batch_id) REFERENCES order_delivery_batches(id),
  CONSTRAINT order_delivery_items_order_item_fk FOREIGN KEY (order_item_id) REFERENCES sales_order_items(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO order_delivery_batches(id,order_id,sequence_no,delivery_kind,delivered_by,delivered_at)
SELECT UUID(),o.id,1,'initial',COALESCE(o.confirmed_by,o.created_by),COALESCE(o.confirmed_at,o.updated_at)
FROM sales_orders o
WHERE o.status IN ('confirmed','partially_returned','returned','cancelled')
  AND EXISTS (SELECT 1 FROM sales_order_items i WHERE i.order_id=o.id AND i.delivered_quantity>0);

INSERT IGNORE INTO order_delivery_items(batch_id,order_item_id,quantity,unit_price_snapshot)
SELECT b.id,i.id,i.delivered_quantity,i.unit_sale_price
FROM order_delivery_batches b
JOIN sales_order_items i ON i.order_id=b.order_id
WHERE b.sequence_no=1 AND i.delivered_quantity>0;

INSERT IGNORE INTO schema_migrations(version) VALUES ('005_order_delivery_history');
