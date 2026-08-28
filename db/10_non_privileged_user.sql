-- This is an optional migration, it is simply to help with setting up a non privileged user.
-- It is important to use a non privilged user without RLS bypass permissions, as otherwise the database user can bypass the audit log integrity RLS rules we set in migration 09.

-- Make sure you have a new database role:
CREATE ROLE soundadvice WITH LOGIN PASSWORD 'change_this_password'; -- set your own user and password here

-- Now we grant our new user permission to read and write to public tables, but restrict the audit logs table.
-- Change 'soundadvice' to your database user below if different, before running the following.

-- allow our role to access the public schema
GRANT USAGE ON SCHEMA public TO soundadvice; 

-- give our app role normal access to all existing tables within the public schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO soundadvice;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO soundadvice; -- for auto incrementing Ids our user needs access to sequences too

-- add the same permissions to future tables and sequences created by future migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO soundadvice;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO soundadvice;

-- now ensure our role can select and insert into the audit log table, but not update or delete.
REVOKE UPDATE, DELETE ON public.audit_log FROM soundadvice;
GRANT SELECT, INSERT ON public.audit_log TO soundadvice;