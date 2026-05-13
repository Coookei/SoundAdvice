# SoundAdvice

SoundAdvice is a secure music help blog for motivated individuals who wish to improve in their musical abilities and so ask for help from others. Therefore, we have implemented guardrails to prevent low quality or spam posts from being surfaced: new posts must be approved by an admin user before they become public.

## Technology

Built with Node.js, Express and PostgreSQL.

## Structure

```
app/
 public/     # static assets rendered on client (html, css, js, images)
 server/     # server-side code
db/          # SQL migration files
logs/        # mirrors the audit_log database table as a second source of truth
test/        # unit tests, mirroring the app/ folder structure
uploads/     # user profile pictures
attacker-app/# verify CSRF and cross-origin protections
```

## Setup

Requires Node.js and a PostgreSQL database.

**1. Install dependencies**

```bash
pnpm install
```

**2. Set up environment variables**

Copy `.env.example` to `.env` and fill in with your credentials.

**3. Apply database migrations**

Apply the SQL migration files in `db/` in order to your PostgreSQL database.

**4. Run the development server**

```
pnpm run dev
```

The app will now be accessible at: http://localhost:3000

## Scripts

```bash
pnpm dev      # start dev server with reloading
pnpm test     # runs all unit tests
pnpm format   # format all files with prettier
pnpm start    # start production server
```

## Database Migrations

To make and keep track of changes to the database, create a new SQL file in the db/ directory, incrementing the numbered prefix in the filename. E.g. 01_init.sql, 02_add_phone_to_users.sql. The file can then be ran to update the database.

## Blog Usability Features

- show error messages: failed client side validation, and rate limiting
- show loading state: disable buttons and change text to loading so users never left waiting
- middleware redirection: if not signed in, sent to sign in; if signed in, redirected from auth pages
- show success messages: show useful messages even after being redireced across pages, for example after signing in
- pending post flow: clear note when creating or editing posts that they will go into a pending process, and visually distinct UI for pending and rejected posts
- usability: different colour buttons for different actions eg edit/delete post

## Infrastructure Protection

- Use HTTPS certificate to encrypt traffic
- Firewall the server and the database with an application firewall like WAF

## Security Vulnerabilities Mitigated

### Account Enumeration

The register, login, forgot password request, forgot password verify, and magic link request endpoints could all be used to check for existence of an account.

This is mitigated by:

1. Generic response messages on success and failure
2. Constant time responses: fake bcrypt compare, remove email delay, and a minimum function response time

### Session Hijacking

Session cookies could be stolen, guessed, or fixated and used to impersonate a logged in user.

This is mitigated by:

1. Long, complex 256 bit random session IDs using crypto.randomBytes, which are infeasible to brute force
2. Server side session storage so we can instantly revoke on logout, password change, or password reset
3. Session expiries: 1 day admin (short as admins privileged), 1 week user, 10 min pending 2FA
4. Session regenerated after 2FA to prevent fixation of attacker using a known session ID
5. Secure cookie flag forces the session cookie to only be sent over HTTPS in production, which blocks network sniffing as HTTPS encrypts all traffic including the cookie itself
6. XSS and CSRF can also lead to session hijacking, which we have protected against

### SQL Injection

Attacker input could be interpreted as SQL commands, letting them read, change, or delete data they shouldnt be able to.

This is mitigated by:

1. Every database call uses a parameterised query with placeholders and values passed as a separate array, so user input is never parsed as SQL.
2. Strong server-side validation in every controller before each query, so only expected inputs reach the database query.
3. We use a least-privileged database role that is not a superuser and does not bypass RLS.

To help identify and mitigate SQL injection, all SQL statements are clearly located in the app/server/queries/ directory.

### Cross-site scripting

Cross-site scripting is when an attacker gets their JavaScript onto one of our pages so it runs in another user's browser. That script can then modify the DOM, read what's on the page, steal session data, or perform actions as the victim.

This is mitigated by:

1. User content goes through a whitelist sanitiser that keeps a few safe tags, strips everything else, and escapes <, >, & so typed characters cant turn into markup
2. Strict input validation in every controller before anything is saved
3. The frontend shows user data with textContent and createElement, never innerHTML, so the browser shows it as plain text instead of being parsed as HTML
4. Content Security Policy with script-src 'self' blocks inline and remote scripts even if something did get onto a page
5. X-Content-Type-Options: nosniff stops the browser running an image or text file as a script
6. The session cookie is HttpOnly so a script cant read it

### Cross-site request forgery

Cross-site request forgery is when a malicious site tricks a logged in user's browser into making a request to our site using their session cookie, causing an action they did not intend.

This is mitigated by:

1. SameSite=Strict on the session cookie, so the browser never sends it on a cross site request
2. No CORS headers anywhere, so browsers block other sites from reading our responses by default
3. Cross-Origin-Resource-Policy is same-origin on /auth/me, so other sites cant embed this and grab the CSRF token
4. CSRF token: every state changing request needs an `x-csrf-token` header. This is an HMAC of the session id so expires when session does
5. Sensitive actions re-check identity: changing the password needs the current password plus an emailed code, so a forged request on its own gets nowhere
6. Origin header check: state changing requests are dropped if the Origin doesnt match our host. This is added on guest routes (login, register, 2FA, forgot password, magic link), where theres no session yet for the token check to use
