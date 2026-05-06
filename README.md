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
