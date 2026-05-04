-- this is all the audit events that we save throuhout the server controllers. matches lib/audit.js
CREATE TYPE audit_event AS ENUM (
    -- registration
    'register', 'register_captcha_fail', 'register_duplicate',
    -- login + 2FA
    'login_success', 'login_fail', 'login_2fa_pending',
    '2fa_success', '2fa_fail', '2fa_expired', '2fa_lockout',
    'logout',
    -- password reset
    'forgot_requested', 'forgot_unknown_email', 'forgot_bad_code', 'forgot_reset',
    -- magic link
    'magic_link_request', 'magic_link_login', 'magic_link_unknown_email',
    'magic_link_admin_blocked', 'magic_link_admin_verify_blocked',
    -- posts and comments
    'post_created', 'post_updated', 'post_deleted', 'post_status_changed',
    'comment_created', 'comment_deleted'
);

CREATE TABLE audit_log (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type audit_event NOT NULL, -- use our enum defined above, and add new events in future migrations
    actor_id   INT, -- save user id, but dont reference the user field, so user deletes cant rewrite history as would mess up the hashing integrity
    ip         TEXT,
    user_agent TEXT,
    detail     TEXT, -- short string detail, eg 'admin edit', 'invalid code'
    post_id    INT,
    comment_id INT,
    created_at TIMESTAMPTZ NOT NULL, -- dont use postgres default time of NOW(). set by the node server so it matches what was hashed
    prev_hash  TEXT NOT NULL, -- the previous rows row_hash, or 64 zeros for the very first row
    row_hash   TEXT NOT NULL, -- sha256 of this rows fields plus prev_hash, so editing any row breaks every row after it
    hmac       TEXT NOT NULL -- row_hash signed with LOG_SECRET, stops an attacker recomputing the hashes after tampering
);

-- admin logs page lists rows by newest first, so this is the only index needed.
CREATE INDEX idx_audit_created_at ON audit_log (created_at DESC);

-- this statement turns on row level security for this table,
-- so that we can enfore an INSERT only policy with no update or deletes allowed.
-- this is to protect the integrity of the audit log table, as events should never be modified or removed.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- by default the table owner bypasses row level security, so use force to prevent this
ALTER TABLE audit_log FORCE  ROW LEVEL SECURITY;

-- now that RLS is enabled, everything is denied by default

-- so add a SELECT policy to allow reading logs for the admin page
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (true);

-- and an INSERT policy to allow adding new log rows
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);

-- UPDATES and DELETE are denied as no policy allowing them.