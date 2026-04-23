-- columns for the forgot-password flow: short-lived token issued after 2FA code verification,
-- then used on the reset form to actually apply the new password
ALTER TABLE users ADD COLUMN password_reset_token   VARCHAR(64);
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMPTZ;
