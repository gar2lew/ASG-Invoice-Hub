# Invoice Hub

A simple invoice hub for sales reps. Reps create invoices using one of two
PDF templates, email them straight to accounts, and keep a personal history
they can re-download or re-send any time.

Deploys on **Vercel** — all data lives in a Postgres database, and PDFs are
generated on demand, so there is no local file storage to lose.

## Features

- **Login per rep** — each rep only sees their own invoices; an admin manages
  reps and company settings.
- **Two invoice templates** — *Standard* (classic ledger) and *Compact*
  (streamlined header band), picked with a simple toggle when creating.
- **Email delivery** — the generated PDF is emailed to the accounts inbox and
  CC'd to the rep. Re-send any invoice later.
- **History dashboard** — every invoice is stored; re-download, re-send, mark
  paid, or delete at any time. PDFs regenerate on the fly.
- **PDF only, no paid services** — uses PDFKit; only Postgres (free tier) and
  a normal SMTP mailbox are needed.

## Quick start (local)

```bash
npm install
copy .env.example .env    # then edit .env
npm start
```

Set `DATABASE_URL` to a Postgres database (Neon or Supabase free tier work
well). Tables are created automatically on first use. Open
http://localhost:3000 and sign in with the admin account seeded from your
`.env` (defaults: `admin` / `changeme`). **Change the password on first use.**

No database handy? Run the built-in test suite, which exercises the full data
layer against an in-memory Postgres emulator:

```bash
npm test
```

## Daily use

1. **Admin → Sales reps**: create an account for each rep.
2. **Admin → Settings**: set company name/ABN, the accounts email address(es),
   and bank details shown on invoices.
3. **Rep**: Dashboard → *New invoice* → pick Standard or Compact template →
   fill customer + line items → **Save draft** or **Save & email**.
4. The invoice appears in the rep's dashboard. From the detail page they can
   download the PDF again, re-send the email, mark it paid, or delete it.

## Email (SMTP) setup

Copy `.env.example` to `.env` and fill in:

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM="Your Company <invoices@yourcompany.com.au>"
```

With `SMTP_HOST` empty, the app runs fully except emailing — invoices can be
created, saved and downloaded, and sending shows a clear error.

## Deploying on Vercel

1. Push the repository to GitHub.
2. In Vercel, import the repo (framework preset: **Other**).
3. Set the environment variables:
   - `DATABASE_URL` — your Postgres connection string (enable SSL).
   - `SESSION_SECRET` — a long random string.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` — first admin account.
   - SMTP variables if you want invoice emailing enabled.
4. Deploy. `vercel.json` routes all traffic to the Express app.

The app uses the free-tier-friendly `@vercel/node` build and a single
function; static assets are served from `public/`.

## Where data lives

Everything is in your Postgres database — invoice records, items, users,
settings. PDFs are not stored: they are regenerated from the saved data on
download or email, so nothing persists on the server filesystem.

## Running on a plain Node host

If you ever deploy outside Vercel (VPS, Railway, Render), just run
`npm start` with `PORT` and the same env vars. A `Dockerfile` is included for
container deployments.

## Tech

- Express 4 + EJS server-rendered pages
- PostgreSQL (via `pg`) — works with Neon, Supabase, or any Postgres host
- PDFKit for on-demand PDF generation
- Nodemailer for email
- cookie-session authentication (bcrypt-hashed passwords)
