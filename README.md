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
