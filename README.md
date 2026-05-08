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
