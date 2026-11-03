ALTER TABLE app_users ADD COLUMN session_expires_at DATETIME(3) NULL;
INSERT IGNORE INTO schema_migrations(version) VALUES ('013_session_lifetime');
