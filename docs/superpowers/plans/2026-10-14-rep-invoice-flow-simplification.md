# Rep Invoice Flow Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a rep select work dates, confirm the amount, save one invoice, and later find it in a clear history list, while retaining current invoice records and admin tools.

**Architecture:** Keep the existing Express invoice API, database schema, PDF generation, and email/status routes. The browser will keep one wage line synchronized with the selected days, save drafts through the existing API, and link to explicit PDF/email actions on invoice detail. The dashboard will render one newest-first invoice list and retain admin-only bulk deletion.

**Tech Stack:** Express, EJS, browser JavaScript, shared CSS, PostgreSQL adapter, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-rep-invoice-flow-simplification-design.md`

## Global Constraints

- Preserve invoice persistence, numbering, customer and work-date details, PDF rendering, email handlers, status history, and admin capabilities. Do not change schema or financial calculation policy in this UX scope.
- Preserve the existing uncommitted wage allocation change from the preceding sprint; do not reset or overwrite it.
- Continue storing one invoice and its line items/details using existing API contracts.
- Save creates a draft only. Email status changes only through the existing explicit email action. Download tracking remains attached to the existing download route.
- No schema or migration changes.
- No PDF layout or wage calculation changes.
- No removal of additional items, notes, GST, half-day support, invoice edit, or admin bulk tools.
- No automatic sending, emailing, or PDF download on save.

## Review Focus

- Selecting no days must remove the wage line and still prevent saving an otherwise empty invoice.
- Changing the selected week must update every selected date and the saved wage-line details.
- Editing an existing draft must restore selected dates and half/full-day states without duplicating the wage line.
- Save must create exactly one draft; email or PDF download must happen only after an explicit detail-page action.
- Admin bulk selection/deletion and rep-only invoice visibility must remain correct after consolidating history.

---

## File Structure

- `public/js/invoice-form.js`: wage day state, live wage-line synchronization, save submission.
- `views/new-invoice.ejs`: primary inputs, optional fields, and single save action.
- `public/css/invoice-builder.css`: weekly picker and invoice-entry responsive layout.
- `views/invoice-detail.ejs` and `public/css/style.css`: explicit post-save email/PDF actions and secondary controls.
- `views/dashboard.ejs`, `public/js/dashboard.js`, and `routes/pages.js` only if needed: single chronological invoice history and compact summary. Existing `db.listInvoices` is already newest-first.
- `tests/saturday-halfday.spec.js`, `tests/shared-week.spec.js`, `tests/wage-description.spec.js`, `tests/wage-persistence.spec.js`, `tests/pdf-download.spec.js`, and a focused journey test if existing coverage does not prove save/history/admin behavior.
- `docs/DevelopmentJournal.md`: sprint entry after implementation.

### Task 1: Align and protect equal-day wage behavior

**Files:**
- Modify: `tests/saturday-halfday.spec.js`
- Modify: `tests/shared-week.spec.js`
- Modify: `tests/wage-description.spec.js`
- Modify: `tests/wage-persistence.spec.js`
- Verify existing implementation in: `public/js/invoice-form.js`, `src/templates.js`

**Interfaces:**
- Consumes: existing day state values `off`, `half`, `full` and shared per-day rate `$1,000 / 6`.
- Produces: regression expectations proving six full days total `$1,000.00`, one full day displays `$166.67`, one half day displays `$83.33`, and totals round to cents.

- [x] **Step 1: Update wage calculation assertions**

Change legacy `$180` weekday / `$100` Saturday expectations to the shared allocation. Assert Mon–Fri `$833.33`, Saturday full `$166.67`, Mon–Sat `$1,000.00`, one weekday full `$166.67`, and one half day `$83.33`. Keep existing date, two-way selection, and state-sync assertions.

- [x] **Step 2: Update wage-detail and persistence assertions**

Assert selected Mon/Wed full plus Sat half totals `$416.67` and details retain each `DD/MM/YYYY` date with “Full day” or “Half day” labels and the shared rate allocation. Confirm off days do not appear and edit restores the same item/details.

- [ ] **Step 3: Run focused wage regression tests** (blocked: Chromium unavailable; see `docs/DevelopmentJournal.md`)

Run: `npx playwright test tests/saturday-halfday.spec.js tests/shared-week.spec.js tests/wage-description.spec.js tests/wage-persistence.spec.js`
Expected: PASS with the existing equal-rate implementation; any failure must be fixed at its source before workflow changes.

### Task 2: Synchronize selected days directly to the wage line

**Files:**
- Modify: `public/js/invoice-form.js`
- Modify: `views/new-invoice.ejs`
- Modify: `tests/shared-week.spec.js`
- Modify: `tests/wage-description.spec.js`
- Modify: `tests/wage-persistence.spec.js`
- Modify: `tests/pdf-download.spec.js`

**Interfaces:**
- Consumes: `weekState.dayStates`, `weekState.weekStarting`, `updateWeekTotal()`, `itemRows()`, and existing wage-item shape `{ description, quantity: 1, rate, details }`.
- Produces: `syncWageLine()` in `public/js/invoice-form.js`, called after day/week changes; it updates the single wage row or removes it when no days are selected. Existing additional items remain untouched.

- [ ] **Step 1: Add direct-sync regression assertions**

Assert that selecting a day creates a wage row without clicking `#calc-add`; changing a day or week updates its total and date details; clearing all days removes only the wage row; existing additional items remain; editing restores one row without duplicates. Remove manual `#calc-add` clicks from create-flow tests while retaining PDF and persistence assertions.

- [ ] **Step 2: Run the focused tests and confirm the new direct-sync assertions fail**

Run: `npx playwright test tests/shared-week.spec.js tests/wage-description.spec.js tests/wage-persistence.spec.js tests/pdf-download.spec.js`
Expected: direct-sync assertions fail because no row is currently added on selection.

- [ ] **Step 3: Implement `syncWageLine()` and wire state changes**

Call it after each day-state change, quick action, and week-start change. Reuse/update the existing wage row; remove it only when all six states are `off`. Preserve other item rows and the existing restore path. Remove the “Add wages to invoice” button from the EJS form.

- [ ] **Step 4: Re-run focused date, persistence, and PDF tests**

Run: `npx playwright test tests/shared-week.spec.js tests/wage-description.spec.js tests/wage-persistence.spec.js tests/pdf-download.spec.js`
Expected: PASS; saved PDF contains each selected date, and repeated downloads still do not create duplicate invoices.

### Task 3: Use one save action and clear post-save actions

**Files:**
- Modify: `views/new-invoice.ejs`
- Modify: `public/js/invoice-form.js`
- Modify: `views/invoice-detail.ejs`
- Modify: `public/css/invoice-builder.css`
- Modify: `public/css/style.css`
- Modify or add: focused invoice journey tests under `tests/`

**Interfaces:**
- Consumes: existing `POST /api/invoices` / `PUT /api/invoices/:id` save contracts and `POST /invoices/:id/send`, `GET /invoices/:id/download` routes.
- Produces: one primary form submission labeled “Save invoice” (edit mode may label it “Save changes”); detail page exposes explicit “Email accounts” and “Download PDF” actions. Successful save navigates to `/invoices/:id`; send keeps the current server validation and status behavior.

- [ ] **Step 1: Add save and post-save journey tests**

In `tests/invoice-journey.spec.js`, assert the create form has one primary save action and no pre-save send/download actions; saving creates one draft and opens detail; the Email accounts control posts to the existing send route; Download PDF records a download without creating another invoice. When test SMTP is configured, assert successful delivery changes status to sent. In the normal SMTP-disabled E2E setup, assert the failure leaves the saved draft intact and reports the send failure. Assert optional number controls do not distract from the default path and remain keyboard-accessible.

- [x] **Step 2: Run the focused journey test and confirm the old UI fails the new assertions** (environment checked; runner cannot reach browser launch because Chromium executable is absent and localhost E2E port returns EACCES)

Run: `npx playwright test tests/invoice-journey.spec.js`
Expected: FAIL on the current pre-save action buttons and absent server-side Email accounts button. The test must not claim delivery succeeded when SMTP is disabled.

- [ ] **Step 3: Simplify the create form controls**

Remove the separate send/download submit buttons and make save the only primary submit. Keep save payload/status behavior draft-only. Put rarely changed invoice-number override/continue-numbering and optional fields into an accessible “More options” disclosure; retain customer/template defaults and required customer name. Remove download/send branching from the form submit handler without changing the API’s backwards-compatible routes.

- [ ] **Step 4: Make detail-page email and PDF the primary next actions**

Replace the `mailto:` primary path with an explicit POST form to `/invoices/:id/send`, gated by `mailEnabled`; label it “Email accounts”. Keep the existing PDF route as “Download PDF”. Move edit, mark-paid, and delete into a secondary “More actions” disclosure. Preserve send errors/status and delete confirmation.

- [ ] **Step 5: Run creation, detail, and PDF regression tests** (blocked: Chromium unavailable; see `docs/DevelopmentJournal.md`)

Run: `npx playwright test tests/invoice-journey.spec.js tests/edit-route.spec.js tests/pdf-download.spec.js`
Expected: PASS; draft save persists once, email is explicit, PDF download does not create a duplicate, and draft edit remains available.

### Task 4: Consolidate rep dashboard history and verify admin behavior

**Files:**
- Modify: `views/dashboard.ejs`
- Modify: `public/js/dashboard.js`
- Modify: shared dashboard styles in `public/css/style.css`
- Modify or add: dashboard/history tests under `tests/`

**Interfaces:**
- Consumes: `routes/pages.js` invoice rows, already sorted newest-first by `db.listInvoices`, plus existing admin flag and bulk delete route.
- Produces: one chronological invoice table with date, customer, invoice number, total, and status. Keep one status filter; admin-only checkboxes and bulk delete continue to target the same delete endpoint.

- [ ] **Step 1: Add dashboard history assertions**

Assert one history list includes draft/sent/paid rows in newest-first order; status filter shows matching rows; rep sees only their own rows; admin can select and bulk-delete invoices. Assert “Create weekly invoice” is the main dashboard action.

- [x] **Step 2: Run focused dashboard tests and confirm current split history fails the consolidated-list assertions** (environment checked; browser runtime unavailable)

Run: `npx playwright test tests/invoice-journey.spec.js tests/admin-features.spec.js`
Expected: FAIL on current paid/outstanding split and current dashboard labels/action hierarchy.

- [ ] **Step 3: Render one history list**

Use the existing newest-first invoice array directly. Remove the separate paid table and adapt `dashboard.js` so the status filter affects the single table. Retain admin-only bulk selection/deletion and avoid changing invoice ownership or admin routes.

- [ ] **Step 4: Simplify dashboard emphasis and responsive layout**

Use one prominent “Create weekly invoice” action, keep the useful weekly/all-time summary compact, and ensure the invoice list remains readable at mobile widths. Keep the pending-drafts notice when drafts exist.

- [ ] **Step 5: Run dashboard and admin regression tests** (blocked: Chromium unavailable; see `docs/DevelopmentJournal.md`)

Run: `npx playwright test tests/invoice-journey.spec.js tests/admin-features.spec.js`
Expected: PASS for rep history, filtering, admin bulk actions, and responsive dashboard layout.

### Task 5: Final verification and delivery notes

**Files:**
- Modify: `docs/DevelopmentJournal.md`
- Review: all changed source and tests

- [ ] **Step 1: Run smoke tests and JavaScript syntax checks**

Run: `npm test`
Run: `node --check public/js/invoice-form.js; node --check public/js/dashboard.js; node --check src/templates.js`
Expected: all pass.

- [ ] **Step 2: Run the complete Playwright suite**

Run: `npx playwright test`
Expected: all relevant suites pass; classify unrelated pre-existing failures without weakening assertions.

- [ ] **Step 3: Inspect desktop and mobile views** (blocked: browser runtime unavailable; see `docs/DevelopmentJournal.md`)

Start the existing E2E server only if one is not already running. Inspect `/`, `/invoices/new`, and a saved invoice detail at desktop and mobile widths. Check keyboard access to “More options” and “More actions”; verify no duplicate wage line and clear action feedback.

- [ ] **Step 4: Update the development journal and inspect final diff**

Record files, cause, implementation, commands/results, remaining issues, and one next sprint in `docs/DevelopmentJournal.md`. Run `git diff --check`, `git status --short`, and `git diff` for all changed files. Do not stage the pre-existing untracked files.

## Self-Review

- **Spec coverage:** dashboard action/history (Task 4); direct selection (Task 2); draft-only save (Task 3); email/PDF (Task 3); preservation of optional fields, edit, half days, admin tools (Tasks 2–4); no schema/PDF/rate changes (Global Constraints).
- **Step scan:** each task groups changes with their behavior tests; existing contracts are named, expected values are explicit, and commands are specified.
- **Type/interface consistency:** `syncWageLine()` stays inside the existing browser script and operates on current item rows; save and send endpoints retain current signatures.
- **Review focus:** no-day, changed week, draft edit, explicit save/email/download, and admin visibility/deletion each have a named task assertion.
- **Proportion:** five dependent tasks keep the cross-screen work reviewable without splitting one rep journey into unrelated specs.

- [x] Implemented Tasks 2–4 in source and coverage (browser verification environment-blocked; see DevelopmentJournal).
