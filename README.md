# SoundAdvice

Every security control in this application is hand-written.

The app is a music advice blog where users help each other improve. Anyone can
post a question, and an admin approves it before it goes public so the quality
stays high. That part is mostly a pretext: it needs accounts, roles, sessions,
user-submitted HTML and file uploads, which makes it a realistic thing to attack.

The platform runs on four packages: express, pg, bcrypt and dotenv. That's the
entire dependency list and it's deliberate. Sessions, CSRF tokens, the HTML
sanitiser, the multipart file parser, rate limiting, password screening,
encrypted email storage with a searchable lookup index, and a hash-chained
audit log are all built on Node's standard library. The same goes for the rest
of the stack: migrations are numbered .sql files applied in order, and there's
no ORM, no template engine and no build step.

In a real product most of this would come from a library. The point here was to
build each control and then try to break it, which is hard to do properly when
the mechanism is hidden behind someone else's API.

Two exceptions, both on purpose: bcrypt for password hashing and Node's crypto
for primitives. Writing your own AES is a bad idea.

Built by a team of three. The work went into the backend and the threat model,
not the interface. The UI is deliberately plain and simple.

## Technology

Built with Node.js, Express and PostgreSQL on the server.

The frontend is as simple as possible: plain HTML, CSS and JavaScript.

Four dependencies: express, pg, bcrypt and dotenv. Tests run on Mocha
and Chai, with Prettier for formatting and pnpm for package management.

Two external services: Cloudflare Turnstile for bot protection on the login and
registration forms, and Resend for transactional email (2FA codes, magic links,
password resets). Font Awesome is loaded from cdnjs with an SRI hash pinned.

## Structure

```
app/
  public/         # client-side html, css, js, images
  server/
    routes/       # route definitions and middleware chains
    controllers/  # request handling, validation, orchestration
    queries/      # every SQL statement in the project lives here
    middleware/   # sessions, CSRF, origin checks, auth guards, headers, rate limiting
    lib/          # crypto, sanitiser, multipart parser, validation, audit log, email
    data/         # common password list used for password screening
db/               # numbered SQL migrations, applied in order
test/             # unit tests, mirroring the app/ structure
attacker-app/     # separate origin used to verify CSRF and cross-origin defences

logs/             # created at runtime; mirrors the audit_log db table as a second source of truth
uploads/          # created at runtime; user profile pictures and post images
```

## Setup

Requires Node.js 18 or newer, a PostgreSQL database, and pnpm, plus a Resend API key and Cloudflare Turnstile keys (both free to sign up for). You will also need openssl,
or any other way to generate random hex strings, for the secrets in `.env`.


**1. Install dependencies**

If you do not have pnpm installed yet, follow the [pnpm installation guide](https://pnpm.io/installation).

```bash
pnpm install
```

**2. Create the database and apply migrations**

Edit `db/10_non_privileged_user.sql` first to set your role name and a strong
password. Run the migrations as a superuser in your PostgreSQL database. Migration 10 creates the non-privileged role the app itself will run as.

```bash
createdb soundadvice
for f in db/*.sql; do psql -d soundadvice -f "$f"; done
```

**3. Set up environment variables**

Copy `.env.example` to `.env` and fill in with your credentials. All variables have been commented to help you with setup.

`DATABASE_URL` should point at the non-privileged role from migration
10, not your superuser account. The audit log's tamper protections rely on the
app running without RLS bypass.

**4. Run the development server**

```
pnpm run dev
```

The app will now be accessible at: http://localhost:3000

**5. Create an admin user**

Register through the app, then promote yourself directly in the database:
```sql
UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
```

There is deliberately no way to grant admin from inside the app. 

At least one admin is required or no post can ever be approved.

Note that admin accounts require email 2FA on every login, so make sure your
Resend key works before promoting your account.

**6. Optional: run the attacker app**

`node attacker-app/server.js` serves a page on http://localhost:4000
that can probe the running app's CSRF and cross-origin defences.

## Scripts

```bash
pnpm dev      # start dev server with reloading
pnpm test     # runs all unit tests
pnpm format   # format all files with prettier
pnpm start    # start production server
```

## Database Migrations

To make and keep track of changes to the database, create a new SQL file in the db/ directory, incrementing the numbered prefix in the filename. E.g. 01_init.sql, 02_add_phone_to_users.sql. The file can then be ran to update the database.

## Usability Features

- Show error messages: failed client side validation, and rate limiting
- Show loading state: disable buttons and change text to loading so users never left waiting
- Middleware redirection: if not signed in, sent to sign in; if signed in, redirected from auth pages
- Show success messages: show useful messages even after being redireced across pages, for example after signing in
- Pending post flow: clear note when creating or editing posts that they will go into a pending process, and visually distinct UI for pending and rejected posts
- Usability: different colour buttons for different actions eg edit/delete post

## Deployment notes

- Use HTTPS certificate to encrypt traffic
- Firewall the server and the database with an application firewall like WAF

## Features

The five classic web vulnerabilities have their own section below. This covers
everything else.

### The app

- Posts with optional images, comments, and search across titles and content
- Public user profiles with a bio, profile picture and the user's approved posts
- Moderation queue: new posts stay pending until an admin approves or rejects them
- Authors can see their own pending and rejected posts, with distinct styling for each

### Authentication flows

- Email 2FA on admin accounts: 6-digit code, 10 minute expiry, 3 attempts before you start over
- Passwordless magic-link login, deliberately blocked for admins since it skips 2FA
- Forgot password in three steps: request a code, verify it, then reset with a short-lived token
- Changing your password needs the current password *and* an emailed code
- A password change logs out every other session but keeps the current one alive

### Password handling

- bcrypt at cost 12, with a server-side pepper from the environment
- New passwords screened against the SecLists top 100k common passwords
- Passwords containing the user's own username or email are rejected, following NIST guidance
- Length is the only composition rule, also per NIST

### Data at rest

- Email addresses encrypted with AES-256-GCM, fresh IV per record
- Lookups still work through an HMAC blind index, keyed with a separate key derived from the encryption key
- 2FA codes, magic-link tokens and reset tokens stored as HMACs, so a database dump has nothing usable in it
- Admin user list shows masked emails, and the public profile endpoint never returns an email or admin flag

### Tamper-evident audit log

- 26 typed events across auth, posts and comments, with the enum mirrored in Postgres
- Each row is SHA-256 hashed together with the previous row's hash, so editing one row breaks every row after it
- Each hash is also HMAC'd with a server secret, so an attacker can't just recompute the chain
- Writes go through a promise queue so concurrent requests can't fork the chain
- Row-level security lets the app role INSERT and SELECT, but never UPDATE or DELETE
- Mirrored to `logs/audit.jsonl` as a second source of truth
- Admins can verify the whole chain from the UI and get back the first row that fails, and why

### Abuse prevention

- Reusable rate limiter with independent budgets per route: 3 per 10 minutes on anything that sends an email, 5 on login and registration, 10 on posts, 15 on comments
- Going over blocks that IP for 10 to 15 minutes depending on the route.
- Cloudflare Turnstile on login and registration, verified server-side, with a clean 503 if Cloudflare is unreachable
- `trust proxy` set in production so limits key off the real client IP rather than the proxy's

### File uploads

- Multipart parser written from scratch, no `multer`
- File type comes from magic bytes (PNG signature, JPEG `FFD8`), not the extension or the client's Content-Type
- 5MB cap enforced while streaming, and the connection is destroyed the moment it's exceeded
- Filenames are generated server-side, so a malicious name can't escape the uploads directory
- Replacing an image deletes the file it replaced

### Access control

- Separate guards for pages and API routes, so pages redirect and APIs return 401
- Admin status is re-read from the database on every request, never carried in the session
- Pending and rejected posts are visible only to their author or an admin
- Ownership checked on every edit and delete, with an admin override
- Direct access to `/html` is blocked, so pages are only reachable through their guarded routes

### Subresource integrity

- SHA-384 hashes for the site's own scripts, computed at startup and injected into the `<script>` tags as pages are served
- The browser refuses to run a script whose bytes don't match, so tampering with a JS file on disk or in transit gets blocked
- Recomputed per request in development so editing a file doesn't break the page

### Input validation

- Every controller validates before anything reaches a query, with typed validators that throw and return a 400
- Whitelist regexes rather than blacklists: usernames are `[A-Za-z0-9_]`, codes are exact-length digit strings
- Every string field has a bounded maximum length
- Integer parsing rejects decimals, negatives, and anything past `MAX_SAFE_INTEGER`

### Security headers

- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` block clickjacking
- `base-uri 'self'` stops a `<base>` tag hijacking every relative URL on the page
- `form-action 'self'` means forms can only submit back to us
- `object-src 'none'` kills the legacy plugin attack surface
- `Referrer-Policy: strict-origin-when-cross-origin` keeps full URLs from leaking off-site
- `Cache-Control: no-store` so a logged-out user can't hit back and see a stale authenticated page

### Vulnerabilities Verified

- `attacker-app/` is a separate origin that demonstrates the CSRF and cross-origin defences holding
- 59 unit tests across the server code
- Manual demos for what unit tests can't cover: uncomment the inline script in `index.html` and watch CSP block it, run `testRowLevelSecurity()` to confirm the database rejects edits to the audit log, or tamper with an audit row and let the chain verifier find it, or change a byte of any JS file in production and watch the browser refuse to run it. Vulnerabilities were tested manually like this.

## Core Security Vulnerabilities Mitigated

### Account Enumeration

The register, login, forgot password request, forgot password verify, and magic link request endpoints could all be used to check for existence of an account.

This is mitigated by:

1. Generic response messages on success and failure
2. Constant time responses: fake bcrypt compare, remove email delay, and a minimum function response time

### Session Hijacking

Session cookies could be stolen, guessed, or fixated and used to impersonate a logged in user.

This is mitigated by:

1. Long, complex 256 bit random session IDs using crypto.randomBytes, which are not practical to brute force
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

Cross-site scripting is when an attacker gets their JavaScript onto one of our pages so it runs in another user's browser. That script can then modify the DOM, read whats on the page, steal session data, or perform actions as the user.

This is mitigated by:

1. User content goes through a whitelist sanitiser that keeps a few safe tags, strips everything else
2. Strict input validation in every controller before anything is saved
3. The frontend builds the DOM with textContent and createElement rather than
   innerHTML, so user data is shown as plain text instead of being parsed as HTML
4. Content Security Policy with script-src 'self' blocks inline and remote scripts even if something did get onto a page
5. X-Content-Type-Options: nosniff stops the browser running an image or text file as a script
6. The session cookie is HttpOnly so a script cant read it

### Cross-site request forgery

Cross-site request forgery is when a malicious site tricks a logged in users browser into making a request to our site using their session cookie, causing an action they did not intend.

This is mitigated by:

1. SameSite=Strict on the session cookie, so the browser never sends it on a cross site request
2. No CORS headers anywhere, so browsers block other sites from reading our responses by default
3. Cross-Origin-Resource-Policy is same-origin on /auth/me, so other sites cant embed this and grab the CSRF token
4. CSRF token on every state changing request needs an `x-csrf-token` header. This is an HMAC of the session id so expires when session does
5. Sensitive actions recheck identity: changing the password needs the current password and an emailed code, so a forged request on its own wont work
6. Origin header check: state changing requests are ignored if the origin doesnt match our host. This is added on guest routes (login, register, 2FA, forgot password, magic link), where theres no session yet for the token check to use