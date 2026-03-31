# SoundAdvice

A secure web-based blog built with Node.js, Express and PostgreSQL.

## Structure

```
app/
 public/     # static assets rendered on client (html, css, js, images)
 server/     # server-side code
```

## Setup

Requires Node.js and PostgreSQL.

```bash
npm install -g pnpm   # if you don't have pnpm

pnpm install
```

Copy `.env.example` to `.env` and fill in the database credentials.

## Scripts

```bash
pnpm dev      # start dev server
pnpm start    # start production server
pnpm format   # format all files with prettier
```

## Database Migrations

To make and keep track of changes to the database, create a new SQL file in the db/ directory, incrementing the numbered prefix in the filename. E.g. 01_init.sql, 02_add_phone_to_users.sql. The file can then be ran to update the database.

## Blog Functionality Notes

- Posts created by non-admin users must be reviewed by an admin before becoming public. Pending state until reviewed by an admin
- Anyone can register and login to the blog platform
- Unlogged in guests can only view posts but cannot interact with the site in any other way
- Admin accounts have more privileges than normal user accounts and so require 2FA
- A post can include text, image(s) or video(s)
- Users and admins can comment on posts. Admin users will stand out with a verified badge in the comments
- Comments on posts can only contain text
