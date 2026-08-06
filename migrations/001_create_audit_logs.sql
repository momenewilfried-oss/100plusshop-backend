-- Migration template: create audit_logs table
-- Execute manually after review: mysql -u user -p database < migrations/001_create_audit_logs.sql

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  module_name VARCHAR(120) NOT NULL,
  action VARCHAR(60) NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (module_name),
  INDEX (action)
);
