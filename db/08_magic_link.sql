ALTER TABLE users ADD COLUMN magic_link_token   VARCHAR(64); -- hashed sign in token used for magic link login
ALTER TABLE users ADD COLUMN magic_link_expires TIMESTAMPTZ;
