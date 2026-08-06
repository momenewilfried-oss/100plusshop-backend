-- Migration template: add soft-delete columns to core tables
-- Execute manually after review: mysql -u user -p database < migrations/002_add_soft_delete_columns.sql

ALTER TABLE produit
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT NULL,
  ADD INDEX (deleted_at);

ALTER TABLE client
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT NULL,
  ADD INDEX (deleted_at);

ALTER TABLE fournisseur
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT NULL,
  ADD INDEX (deleted_at);

ALTER TABLE categorie
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT NULL,
  ADD INDEX (deleted_at);

ALTER TABLE utilisateur
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT NULL,
  ADD INDEX (deleted_at);

-- Note: apply these migrations in a maintenance window and update repositories to use soft-delete gradually.
