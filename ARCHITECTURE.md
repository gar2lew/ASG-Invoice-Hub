# REP Invoice System - Architecture Documentation

## Project Overview
REP Invoice System is a Node.js/Express web application for creating and managing invoices for ASG (Amplify Solutions Group) and SJS (SJS Wealth Solutions) companies. The application uses EJS templates, PostgreSQL database, and serves static assets from the `public/` directory.

## Tech Stack
- **Runtime**: Node.js (Express.js)
- **Templating**: EJS (Embedded JavaScript)
- **Database**: PostgreSQL (via `pg`)
- **Test Database**: pg-mem (in-memory PostgreSQL-compatible driver for tests)
- **Frontend**: Vanilla JavaScript (ES5 compatible), CSS
- **Testing**: Playwright (E2E), Custom smoke tests
- **Build**: No build step required (vanilla JS/CSS)
- **Deployment**: Vercel (api/index.js → src/app.js)

## Project Structure
```
REP INVOICE SYSTEM/
├── api/
│   └── index.js                # Vercel entry point (exports src/app.js)
├── public/
│   ├── css/
│   │   └── style.css           # Main stylesheet
│   └── js/
│       ├── dashboard.js        # Dashboard page logic
│       ├── invoice-form.js     # Invoice form + shared week state logic
│       └── theme.js            # Theme toggle (light/dark)
├── routes/
│   ├── admin.js                # Admin routes (settings, users, reports, bulk deletion)
│   ├── auth.js                 # Authentication routes (login, signup, logout)
│   ├── invoices.js             # Invoice CRUD API routes
│   └── pages.js                # Page rendering routes
├── src/
│   ├── app.js                  # Express app setup
│   ├── db.js                   # Database initialization & queries (PostgreSQL)
│   ├── helpers.js              # Formatting helpers (money, dates, week bounds)
│   ├── mail.js                 # Email delivery (nodemailer)
│   ├── middleware.js           # Auth middleware (requireAuth, requireAdmin, currentUser)
│   ├── pdf.js                  # PDF generation (pdfkit)
│   └── templates.js            # Template definitions (ASG/SJS)
├── views/
│   ├── admin-dashboard.ejs     # Admin dashboard
│   ├── admin-reports.ejs       # Admin reports with filters
│   ├── dashboard.ejs           # Main dashboard
│   ├── invoice-detail.ejs      # Invoice detail view
│   ├── login.ejs               # Login page
│   ├── new-invoice.ejs         # New/edit invoice form
│   ├── notfound.ejs            # 404 page
│   ├── partials/
│   │   ├── footer.ejs          # Footer partial
│   │   ├── head.ejs            # Head partial (fonts, CSS, theme.js)
│   │   └── header.ejs          # Header partial
│   ├── settings.ejs            # Admin settings
│   ├── signup.ejs              # Rep account creation
│   └── users.ejs               # Admin user management
├── tests/                      # Playwright E2E tests
├── test/
│   ├── pg-mem-driver.js        # pg-mem driver for testing
│   ├── run-smoke.js            # Smoke tests (unit/integration)
│   ├── setup-e2e-db.js         # E2E database setup
│   └── start-e2e-server.js     # E2E test server
├── server.js                   # Entry point
├── package.json
├── playwright.config.js        # Playwright configuration
├── vercel.json                 # Vercel deployment config
└── ARCHITECTURE.md             # This file
```

## Key Features

### 1. Shared Week State (Invoice Form)
The invoice form (`new-invoice.ejs`) includes a **shared week state** feature that synchronizes two widgets:
- **Wage Calculator** (`#calc-days`): Checkboxes for Mon-Sat with rate input
- **Dates & Notes** (`#wage-days`): Checkboxes for Mon-Sat with date inputs and notes

**Synchronization Logic** (`public/js/invoice-form.js`):
- `weekState` object holds: `workedDays[]`, `perDayRate`, `weekStarting`, `notes`
- `updateWeekState()` reads from the active source widget
- `onWeekStateChanged(source)` handles events from either widget
- `syncDayToggles(source, target)` copies checkbox states between widgets
- When week start date changes, day checkboxes persist (only dates update)

**Date Handling**:
- Week start input normalizes to Monday (any day of week → Monday of that week)
- Dates displayed as DD/MM/YYYY in labels, stored as YYYY-MM-DD in date inputs
- `formatDateForInput()` formats dates in local timezone (avoids UTC offset issues)

### 2. Invoice Templates
Two company templates defined in `src/templates.js`:
- **ASG** (Amplify Solutions Group): ABN 43 663 126 725
- **SJS** (SJS Wealth Solutions): ABN 89 622 469 845

Templates control:
- Company details (name, ABN, address, phone, email)
- PDF styling (standard vs compact)

### 3. Authentication
- Session-based auth with bcrypt password hashing
- Admin user (full access) + Rep users (own invoices only)
- Login at `/login`, logout at `/logout`
- Rep signup at `/signup`

### 4. PDF Generation
- Uses `pdfkit` for server-side PDF generation
- Two templates: `renderStandard` and `renderCompact`
- Download via form action `download`
- Email send via form action `send` (uses nodemailer)
- Rep bank details shown in FROM block with company fallback

### 5. Theme System
- Light/dark theme toggle with localStorage persistence
- Defaults to light theme
- Applied immediately to avoid flash (`public/js/theme.js`)

## Data Flow

### Invoice Creation
1. User fills form at `/invoices/new`
2. Form submits to `POST /api/invoices` with action: `draft` | `send` | `download`
3. `routes/invoices.js` validates and persists to PostgreSQL
4. On `download`: returns PDF blob
5. On `send`/`draft`: redirects to `/invoices/:id`

### Shared Week State Flow
1. User enters week start date → `change` event on `#week_start`
2. `onWeekStateChanged('week-start')` → `updateWeekState()` → `renderWageCalculator()` + `renderDatesNotes()`
3. User toggles checkbox in either widget → `change` event
4. `onWeekStateChanged(source)` syncs to other widget, updates state, re-renders
5. User clicks "Add to invoice" → `addLine()` creates line item with calculated wage

## Database Schema

### Users (admin + reps)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  pin_hash TEXT DEFAULT '',
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  abn TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',        -- Rep bank details
  bank_bsb TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'rep',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Settings
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  company_name TEXT DEFAULT '',
  company_abn TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  company_phone TEXT DEFAULT '',
  company_email TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_bsb TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  accounts_email TEXT DEFAULT '',
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  payment_terms TEXT DEFAULT 'Payment due within 14 days',
  footer_note TEXT DEFAULT 'Thank you for your business.'
);
```

### Invoices
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  template TEXT NOT NULL DEFAULT 'standard',
  customer_name TEXT NOT NULL,
  customer_company TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  issue_date TEXT NOT NULL,
  due_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  total DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TEXT DEFAULT '',
  paid_at TEXT DEFAULT '',
  downloaded_at TIMESTAMPTZ,          -- Download tracking
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Line Items
```sql
CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  details JSONB DEFAULT '[]'::jsonb  -- Wage day breakdown
);
```

## Testing

### Smoke Tests (`npm test`)
Run `test/run-smoke.js` - covers:
- Admin/rep user seeding & auth
- Invoice CRUD & numbering
- Line items
- Settings persistence
- Stats aggregation
- Rep bank details persistence

### Playwright E2E Tests (`npx playwright test`)
Located in `tests/` - covers:
- Authentication (admin login, rep login, signup)
- Admin features (user management, reports, CSV export, theme toggle)
- Invoice features (PDF download, edit route, ASG/SJS templates)
- Shared week state (synchronization, wage calculation, persistence)
- Saturday half-day calculation
- Structured wage descriptions

## Configuration
Environment variables:
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (required)
- `DATABASE_SSL` - Set to 'false' to disable SSL
- `SESSION_SECRET` - Session secret (default: dev-secret-change-me)
- `ADMIN_USERNAME` - Admin username (default: admin)
- `ADMIN_PASSWORD` - Admin password (default: changeme)
- `ADMIN_EMAIL` - Admin email
- `SMTP_HOST` - SMTP server host (enables email)
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_SECURE` - 'true' for TLS
- `MAIL_FROM` - Override From address

## Development Commands
```bash
npm start          # Start server (PORT=3000)
npm test           # Run smoke tests
npx playwright test # Run E2E tests
npx playwright test --ui # Playwright UI mode
```

## Known Issues / Quirks
1. **Playwright checkbox events**: `.check()` doesn't trigger `change` event; use `.click()` instead
2. **Date timezone**: Use `formatDateForInput()` instead of `toISOString()` to avoid UTC offset shifting dates
3. **Test isolation**: Tests share database state; use unique data or clean up between tests
