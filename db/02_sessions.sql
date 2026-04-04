CREATE TABLE sessions (
    sid                  VARCHAR(64)  PRIMARY KEY,                                    -- session ID
    user_id              INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- links session to user
    pending              BOOLEAN      NOT NULL DEFAULT FALSE,                          -- whether user has completed 2FA
    two_factor_attempts  INT          NOT NULL DEFAULT 0,                              -- failed 2FA attempts
    expires_at           TIMESTAMPTZ  NOT NULL,                                        
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()                           
);

CREATE INDEX idx_sessions_expires ON sessions (expires_at);
