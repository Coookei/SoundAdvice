-- encrypt email addresses at rest
-- existing data is wiped, test users must be recreated after running this

ALTER TABLE users DROP COLUMN email;
ALTER TABLE users ADD COLUMN email_hash      VARCHAR(64) NOT NULL UNIQUE; -- HMAC for lookups
ALTER TABLE users ADD COLUMN email_encrypted TEXT        NOT NULL;        -- AES-256-GCM ciphertext
