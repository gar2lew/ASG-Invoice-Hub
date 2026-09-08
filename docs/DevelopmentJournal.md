# Development Journal

Purpose: This journal documents meaningful sprints, changes, and decisions for the REP Invoice System.
Each entry should include: Date, Sprint/Version, Objective, Files Changed, Root Cause/Reason, Implementation Summary, Validation, Problems Found, Problems Remaining, Next Recommended Sprint.

## Initial Entry - 2026-08-27

Sprint: Documentation and Development-Governance
Objective: Establish permanent project-governance files (AGENTS.md, ROADMAP.md, TECH_DEBT.md, CHANGELOG.md, docs/DevelopmentJournal.md, docs/DecisionLog.md) to create a permanent operating framework for all future work.
Files Changed:
- AGENTS.md (new)
- ROADMAP.md (new)
- TECH_DEBT.md (new)
- CHANGELOG.md (new)
- docs/DevelopmentJournal.md (new)
- docs/DecisionLog.md (new)
Root Cause/Reason: Need for clear development principles, source-of-truth rule, scope control, and verification practices to prevent patch escape-drift and false mutation reports.
Implementation Summary: Created the six governance files with sections as defined in the sprint objective. AGENTS.md contains the core contract including investigation phase, source-of-truth rule, architecture rules, production safety rules, test rules, Playwright rules, PDF protection rules, UI/design rules, file mutation verification, documentation rules, development journal rules, decision log rules, completion report standard, and STOP rule.
Validation: 
- git status shows only the new files added.
- git diff shows no changes to existing source files.
Problems Found: None.
Problems Remaining: 
- Playwright authentication state inheritance causing admin test timeouts (recorded in TECH_DEBT.md as Investigate Later).
Next Recommended Sprint: Finish deterministic Playwright authentication and full-suite verification.

## Sprint - 2026-09-07

Sprint: Production Email and Theme Defaults
Objective: Make invoice delivery seamless by routing every invoice to Natalie at SJS Solutions and make light theme the default.
Files Changed:
- src/mail.js
- routes/invoices.js
- public/js/theme.js
- views/new-invoice.ejs
- views/settings.ejs
- test/run-smoke.js
Root Cause/Reason: Invoice recipients previously came from configurable accounts and rep email addresses, while the theme fallback could select dark mode from system preference.
Implementation Summary: Centralised the fixed invoice recipient, applied it to both send paths, updated the UI copy, and changed the theme fallback to light while preserving localStorage preferences.
Validation:
- npm test — passed.
- node --check src/mail.js — passed.
- node --check routes/invoices.js — passed.
- git diff reviewed for all intended files.
Problems Found: None in the targeted checks.
Problems Remaining: Rep accounts still need to be created through the admin Sales reps page using the actual rep names and temporary PINs.
Next Recommended Sprint: Create and validate the production rep accounts and SMTP delivery using the production environment.

## Sprint - 2026-09-07

Sprint: Admin Bulk Invoice Deletion
Objective: Allow administrators to delete selected invoices directly from the dashboard.
Files Changed:
- src/db.js
- routes/admin.js
- views/dashboard.ejs
- public/js/dashboard.js
Root Cause/Reason: Administrators could delete individual invoices from detail views but had no dashboard bulk-management action.
Implementation Summary: Added an admin-only bulk deletion endpoint, per-row checkboxes, select-all controls per invoice table, confirmation prompts, and a parameterised multi-ID database deletion helper.
Validation:
- npm test — passed.
- node --check routes/admin.js — passed.
- node --check src/db.js — passed.
- node --check public/js/dashboard.js — passed.
- git diff --check — passed.
Problems Found: None in the targeted checks.
Problems Remaining: The deletion flow still requires browser-level verification against the deployed production UI.
Next Recommended Sprint: Deploy and manually verify selection, confirmation, deletion, and non-admin access denial.

## Sprint - 2026-09-07

Sprint: Rep Payment Details
Objective: Allow rep-specific bank details to appear on their invoices.
Files Changed:
- src/db.js
- routes/admin.js
- views/users.ejs
- routes/invoices.js
- src/pdf.js
- test/run-smoke.js
Root Cause/Reason: Bank details were only available as company-wide settings, so reps could not show their own payment details.
Implementation Summary: Added migration-safe rep bank fields, captured them during rep creation, passed them into invoice rendering, and used them in both PDF templates with company-level fallback.
Validation:
- npm test — passed, including rep bank persistence.
- JavaScript syntax checks — passed.
- git diff --check — passed.
Problems Found: None in targeted checks.
Problems Remaining: Existing reps with blank bank fields need updating or recreating through the admin workflow if they should use rep-specific details.
Next Recommended Sprint: Add an edit profile action for existing reps if required.

## Sprint - 2026-09-07

Sprint: PDF Download and Rep Invoice Layout
Objective: Fix invoice form download fallback and improve generated invoice readability and rep information.
Files Changed:
- views/new-invoice.ejs
- routes/invoices.js
- src/pdf.js
Root Cause/Reason: The invoice form relied on JavaScript to submit POST requests, allowing a failed script load to fall back to an invalid GET request; PDF output also lacked rep contact/payment details and gave daily breakdown text too much visual weight.
Implementation Summary: Added an explicit POST method, passed rep email and bank details into rendering, added a From block above Bill To in both templates, enlarged primary line descriptions, and reduced daily detail typography.
Validation:
- npm test — passed.
- node --check src/pdf.js — passed.
- node --check routes/invoices.js — passed.
- git diff --check — passed.
Problems Found: None in targeted checks.
Problems Remaining: Browser-level production verification and visual PDF review remain.
Next Recommended Sprint: Deploy and inspect both generated PDF templates with a real rep account.

## Sprint - 2026-09-08

Sprint: Hermes Takeover from Codex
Objective: Reconstruct current repository state after Codex development, restore test baseline to green, and correct stale architecture documentation.
Files Changed:
- tests/saturday-halfday.spec.js
- tests/shared-week.spec.js
- tests/wage-description.spec.js
- ARCHITECTURE.md
- docs/DevelopmentJournal.md
Root Cause/Reason: Codex added rep bank details, admin bulk deletion, PDF FROM block, and changed the ASG per-day wage rate from 181.82 to 200. Seven Playwright tests still asserted the old 181.82 rate, causing failures. ARCHITECTURE.md still referenced SQLite/better-sqlite3.
Implementation Summary:
- Confirmed current per-day rate is $200/day in production logic (public/js/invoice-form.js companyConfigs.asg.perDayRate)
- Updated 7 stale Playwright test assertions to match $200/day rate while preserving all behavioral coverage (Saturday 0.5 multiplier, Shared Week sync, Dates & Notes sync, structured wage descriptions, invoice totals)
- Rewrote ARCHITECTURE.md to reflect current stack: Node.js, Express, EJS, PostgreSQL, pg, pg-mem, cookie-session, bcrypt, PDFKit, Vercel, api/index.js → src/app.js
- Documented current schema additions: users.bank_name/bsb/account, invoices.downloaded_at/download_count, invoice_items.details JSONB
Validation:
- npm test — 26/26 PASS
- npx playwright test — 38/38 PASS
- git diff --check — PASS
Problems Found: 7 stale test expectations from pre-200 rate; outdated architecture documentation.
Problems Remaining: None.
Next Recommended Sprint: Deploy current state to production and verify with real rep account.
