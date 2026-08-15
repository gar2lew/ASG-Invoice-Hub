# Invoice Hub

A simple invoice hub for sales reps. Reps create invoices using one of two
PDF templates, email them straight to accounts, and keep a personal history
they can re-download or re-send any time.

## Features

- **Login per rep** — each rep only sees their own invoices; an admin manages
  reps and company settings.
- **Two invoice templates** — *Standard* (classic ledger) and *Compact*
  (streamlined header band), picked with a simple toggle when creating.
- **Email delivery** — the generated PDF is emailed to the accounts inbox and
  CC'd to the rep. Re-send any invoice later.
- **History dashboard** — every invoice is stored with its PDF; re-download,
  re-send, mark paid, or delete.
- **PDF only, no paid services** — uses PDFKit; only a normal SMTP mailbox is
  needed for email.

## Quick start (local)

```bash
npm install
copy .env.example .env    # then edit .env
npm start
```

Open http://localhost:3000 and sign in with the admin account seeded from your
`.env` (defaults: `admin` / `changeme`). **Change the password on first use.**

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

## Where data lives

Everything is stored in the `data/` folder at the project root:

```
data/
  invoices.db      # SQLite database (users, settings, invoice records)
  invoices/        # the generated PDF files
```

**Back this folder up** — it is your entire invoice history. To reset the app,
delete `data/` and restart; a fresh admin account is seeded again.

## Deployment (hosted)

The app is a plain Node/Express server. Deploy it anywhere Node is supported
(Render, Railway, Fly.io, a VPS). Requirements:

1. Set the env vars from `.env.example` (especially `SESSION_SECRET`).
2. **Persistent disk**: mount a volume at `/app/data` so the database and PDFs
   survive restarts (e.g. Render Disk, Railway Volume, Fly Volume).

With Docker:

```bash
docker build -t invoice-hub .
docker run -p 3000:3000 -v invoice-data:/app/data invoice-hub
```

## Tech

- Express 4 + EJS server-rendered pages
- better-sqlite3 (SQLite) for storage
- PDFKit for PDF generation
- Nodemailer for email
- cookie-session authentication (bcrypt-hashed passwords)
