# REP Invoice System - Architecture Documentation

## Project Overview
REP Invoice System is a Node.js/Express web application for creating and managing invoices for ASG (Australian Services Group) and SJS (South Jersey Services) companies. The application uses EJS templates, SQLite database, and serves static assets from the `public/` directory.

## Tech Stack
- **Runtime**: Node.js (Express.js)
- **Templating**: EJS (Embedded JavaScript)
- **Database**: SQLite (via `better-sqlite3`)
- **Frontend**: Vanilla JavaScript (ES5 compatible), CSS
- **Testing**: Playwright (E2E), Custom smoke tests
- **Build**: No build step required (vanilla JS/CSS)
- **Deployment**: Single-process Node.js server

## Project Structure
```
REP INVOICE SYSTEM/
├── public/
│   ├── css/
│   │   └── style.css          # Main stylesheet
│   ├── js/
│   │   ├── dashboard.js       # Dashboard page logic
│   │   └── invoice-form.js    # Invoice form + shared week state logic
│   └── favicon.ico
├── routes/
│   ├── invoices.js            # Invoice CRUD API routes
│   └── pages.js               # Page rendering routes
├── src/
│   ├── app.js                 # Express app setup
│   ├── db.js                  # Database initialization & queries
│   ├── pdf.js                 # PDF generation (pdfkit)
│   └── templates.js           # Template definitions (ASG/SJS)
├── views/
│   ├── dashboard.ejs          # Dashboard page
│   ├── login.ejs              # Login page
│   ├── new-invoice.ejs        # New invoice form (main form)
│   └── view-invoice.ejs       # Invoice view page
├── tests/
│   ├── shared-week.spec.js    # Playwright E2E tests for shared week state
│   └── fixtures/              # Test fixtures
├── test/
│   └── run-smoke.js           # Smoke tests (unit/integration)
├── server.js                  # Entry point
├── package.json
├── playwright.config.js       # Playwright configuration
└── README.md
```

## Key Features

### 1. Shared Week State (Invoice Form)
The invoice form (`new-invoice.ejs`) includes a **shared week state** feature that synchronizes two widgets:
- **Wage Calculator** (`#calc-days`): Checkboxes for Mon-Fri with rate input
- **Dates & Notes** (`#wage-days`): Checkboxes for Mon-Fri with date inputs and notes

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
- **ASG** (Australian Services Group): Navy theme, ABN 12 345 678 901
- **SJS** (South Jersey Services): Orange theme, ABN 98 765 432 109

Templates control:
- Header colors, logos, company details
- Wage line mode: `aggregated` (single line) vs `daily` (per-day lines)
- PDF styling

### 3. Authentication
- Session-based auth with bcrypt password hashing
- Admin user (full access) + Rep users (own invoices only)
- Login at `/login`, logout at `/logout`

### 4. PDF Generation
- Uses `pdfkit` for server-side PDF generation
- Download via form action `download`
- Email send via form action `send` (stores for later processing)

## Data Flow

### Invoice Creation
1. User fills form at `/invoices/new`
2. Form submits to `POST /api/invoices` with action: `draft` | `send` | `download`
3. `routes/invoices.js` validates and persists to SQLite
4. On `download`: returns PDF blob
5. On `send`/`draft`: redirects to `/invoices/:id`

### Shared Week State Flow
1. User enters week start date → `change` event on `#week_start`
2. `onWeekStateChanged('week-start')` → `updateWeekState()` → `renderWageCalculator()` + `renderDatesNotes()`
3. User toggles checkbox in either widget → `change` event
4. `onWeekStateChanged(source)` syncs to other widget, updates state, re-renders
5. User clicks "Add to invoice" → `addLine()` creates line item with calculated wage

## Database Schema
```sql
-- Users (admin + reps)
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT CHECK(role IN ('admin','rep')),
  full_name TEXT,
  abn TEXT,
  pin_hash TEXT
);

-- Invoices
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  number TEXT UNIQUE,           -- e.g., INV-0001
  rep_id INTEGER,
  customer_name TEXT,
  customer_email TEXT,
  customer_address TEXT,
  template TEXT,                -- 'asg' | 'sjs'
  status TEXT,                  -- 'draft' | 'sent'
  sent_at TEXT,                 -- ISO timestamp
  week_start TEXT,              -- YYYY-MM-DD (Monday)
  notes TEXT,
  subtotal REAL,
  gst REAL,
  total REAL,
  created_at TEXT,
  updated_at TEXT
);

-- Line items
CREATE TABLE line_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER,
  description TEXT,
  quantity REAL,
  rate REAL,
  amount REAL,
  sort_order INTEGER
);

-- Settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
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

### Playwright E2E Tests (`npx playwright test`)
Located in `tests/shared-week.spec.js` - covers:
- Week date populates both widgets correctly
- Toggle sync between Wage Calculator ↔ Dates & Notes
- Untoggling synchronizes both widgets
- Complete three-day wage calculation
- Add shared week to invoice
- Changing week start preserves selected days

## Configuration
Environment variables:
- `PORT` - Server port (default: 3000)
- `ADMIN_USERNAME` - Admin username (default: 'admin')
- `ADMIN_PASSWORD` - Admin password (default: 'changeme')
- `SESSION_SECRET` - Session secret
- `DATABASE_PATH` - SQLite file path (default: 'data/invoice-hub.sqlite')

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
4. **No headless Chrome**: In some environments, Playwright runs in headful mode only