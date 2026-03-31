CREATE TABLE users (
    id                 INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- auto incrementing unique user ID
    username           VARCHAR(25)  NOT NULL UNIQUE, -- unique username
    email              VARCHAR(255) NOT NULL UNIQUE, -- unique email
    password           TEXT         NOT NULL,     -- hashed password
    is_admin           BOOLEAN      NOT NULL DEFAULT FALSE, -- whether admin
    email_code         VARCHAR(6),  -- 2FA email code
    email_code_expires TIMESTAMPTZ,  -- 2FA email code expiration time
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW() -- when user created
);

CREATE TYPE post_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE posts (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, --auto incrementing post ID
    user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE, --links post to user, deletes posts if user deleted
    title      VARCHAR(200) NOT NULL, --post title
    content    TEXT         NOT NULL, -- main post text content
    status     post_status  NOT NULL DEFAULT 'pending', 
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(), -- when post created
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW() -- when post was last updated
);
