ALTER TABLE app_users ADD COLUMN permissions JSON NULL;
ALTER TABLE app_users ADD COLUMN permissions_version INT NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN cost_configured BOOLEAN NOT NULL DEFAULT TRUE;
INSERT IGNORE INTO schema_migrations(version) VALUES ('012_staff_permissions');
