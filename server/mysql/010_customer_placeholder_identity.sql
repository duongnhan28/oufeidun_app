-- A placeholder phone such as 0 is not a unique person.
ALTER TABLE customers ADD COLUMN identity_key VARCHAR(260) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin GENERATED ALWAYS AS
  (CASE WHEN TRIM(phone)<>'' AND REPLACE(TRIM(phone),'0','')=''
    THEN CONCAT('unknown:',phone,':',LOWER(TRIM(name))) ELSE CONCAT('phone:',phone) END) STORED;

ALTER TABLE customers MODIFY COLUMN identity_key VARCHAR(260) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin GENERATED ALWAYS AS
  (CASE WHEN TRIM(phone)<>'' AND REPLACE(TRIM(phone),'0','')=''
    THEN CONCAT('unknown:',phone,':',LOWER(TRIM(name))) ELSE CONCAT('phone:',phone) END) STORED;

ALTER TABLE customers ADD UNIQUE KEY customers_identity_unique (identity_key);

ALTER TABLE customers DROP INDEX customers_phone_unique;

-- Only recover customers demonstrably overwritten on a shared placeholder.
-- Do not resurrect deliberately inactive customers or invent phone/price data.
INSERT IGNORE INTO customers(id,customer_type,name,phone,address,note,active)
SELECT UUID(),r.customer_type,r.customer_name,r.customer_phone,r.customer_address,'',TRUE
FROM (
 SELECT o.customer_type,o.customer_name,o.customer_phone,o.customer_address,
 ROW_NUMBER() OVER (PARTITION BY o.customer_phone,LOWER(TRIM(o.customer_name)) COLLATE utf8mb4_bin ORDER BY o.updated_at DESC,o.id) rn
 FROM sales_orders o JOIN customers c ON c.id=o.customer_id
 JOIN (SELECT customer_id FROM sales_orders WHERE status<>'deleted' AND TRIM(customer_phone)<>'' AND REPLACE(TRIM(customer_phone),'0','')=''
   GROUP BY customer_id HAVING COUNT(DISTINCT LOWER(TRIM(customer_name)) COLLATE utf8mb4_bin)>1) affected ON affected.customer_id=o.customer_id
 WHERE o.status<>'deleted' AND c.active=TRUE AND c.phone=o.customer_phone
 AND TRIM(o.customer_phone)<>'' AND REPLACE(TRIM(o.customer_phone),'0','')=''
 AND TRIM(o.customer_name)<>'' AND BINARY LOWER(TRIM(c.name))<>BINARY LOWER(TRIM(o.customer_name))
) r WHERE r.rn=1;

UPDATE sales_orders o JOIN customers old ON old.id=o.customer_id
JOIN (SELECT customer_id FROM sales_orders WHERE status<>'deleted' AND TRIM(customer_phone)<>'' AND REPLACE(TRIM(customer_phone),'0','')=''
  GROUP BY customer_id HAVING COUNT(DISTINCT LOWER(TRIM(customer_name)) COLLATE utf8mb4_bin)>1) affected ON affected.customer_id=o.customer_id
JOIN customers restored ON restored.phone=o.customer_phone AND BINARY LOWER(TRIM(restored.name))=BINARY LOWER(TRIM(o.customer_name)) AND restored.active=TRUE
SET o.customer_id=restored.id,o.updated_at=o.updated_at
WHERE o.status<>'deleted' AND old.active=TRUE AND old.phone=o.customer_phone
AND TRIM(o.customer_phone)<>'' AND REPLACE(TRIM(o.customer_phone),'0','')=''
AND BINARY LOWER(TRIM(old.name))<>BINARY LOWER(TRIM(o.customer_name));

INSERT IGNORE INTO schema_migrations(version) VALUES ('010_customer_placeholder_identity');
