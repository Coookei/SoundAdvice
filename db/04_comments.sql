CREATE TABLE comments (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- auto incrementing unique comment ID
    post_id    INT  NOT NULL REFERENCES posts(id) ON DELETE CASCADE, --links comment to post, deletes comment if post deleted
    user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE, --links comment to user, deletes comment if user deleted
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
