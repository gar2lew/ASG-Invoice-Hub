# Rep Invoice Flow Simplification

Date: 2026-10-14
Status: Approved by user on 2026-10-14; implementation plan in review.

## Objective

Make the routine rep task direct and predictable: select the correct work dates, confirm customer details and total, save one invoice, and find it later in history.

## Current behavior and constraints

- `/invoices/new` contains a weekly wage selector, a separate “Add wages to invoice” action, additional line items/GST, a live invoice preview, and Save draft / Send & email / Download PDF controls.
- The API already creates invoice records with line-item details and returns the saved invoice ID.
- Invoice detail already supports PDF download and email-related actions.
- The dashboard splits outstanding and paid invoices; reps can see their own records while admins have bulk delete controls.
- Preserve invoice persistence, numbering, customer and work-date details, PDF rendering, email handlers, status history, and admin capabilities. Do not change schema or financial calculation policy in this UX scope.
- Preserve the existing uncommitted wage allocation change from the preceding sprint; do not reset or overwrite it.

## Proposed rep flow

1. Dashboard presents one prominent **Create weekly invoice** action, a compact useful summary, and one chronological invoice history. Administrative controls remain conditional for admins.
2. Invoice entry uses one weekly checklist. Selecting or changing a day immediately creates or updates the wage line and total; no separate “Add wages” step is required. If no day is selected, no wage line is submitted. Existing customer, template, week date, half-day, optional item, note, and GST behavior remain available.
3. The primary action is **Save invoice**. It persists the invoice as a draft and navigates to its detail page. It does not send or download implicitly.
4. The detail page presents **Email accounts** and **Download PDF** as the main next actions. Email continues to use the existing server-side send route and existing validation; PDF continues to use the existing download route. Status, edit-draft, mark-paid, and delete controls remain available with lower visual emphasis.
5. History becomes one chronological list with creation date, customer, total, and status. Invoice detail remains the place for less frequent actions. Admin bulk selection/deletion is preserved.

## Data and behavior

- Continue storing one invoice and its line items/details using existing API contracts.
- Work-date details remain attached to the wage line and are shown in the invoice detail/PDF as currently supported.
- Save creates a draft only. Email status changes only through the existing explicit email action. Download tracking remains attached to the existing download route.
- Continue to validate required customer name and at least one invoice item before save.
- Any browser/API failure remains visible on the form or detail page; do not present success until persistence/send succeeds.

## Scope boundaries

- No schema or migration changes.
- No PDF layout or wage calculation changes.
- No removal of additional items, notes, GST, half-day support, invoice edit, or admin bulk tools.
- No automatic sending, emailing, or PDF download on save.

## Implementation areas

- `views/dashboard.ejs`, `routes/pages.js`, and shared CSS for the rep-focused dashboard/history presentation.
- `views/new-invoice.ejs`, `public/js/invoice-form.js`, and `public/css/invoice-builder.css` for direct day-to-line synchronization and a single save action.
- `views/invoice-detail.ejs` and relevant CSS for the post-save actions.
- Focused regression coverage for date selection, automatic wage-line updates, draft save, explicit email/download actions, history, and admin controls.
- Update the development journal after implementation.

## Validation plan

- Update wage assertions affected by the already changed daily allocation, without weakening unrelated regression coverage.
- Run focused Playwright coverage for creation/editing, wage dates and persistence, invoice detail actions/history, and admin behavior where touched.
- Run `npm test`, syntax checks, and `git diff --check`.
- Inspect the rendered rep flow at desktop and mobile widths.

## Self-review

- The design reuses the existing invoice API, detail page, status/download tracking, and database schema.
- Saving never implies emailing or downloading, so a draft remains a recoverable persisted invoice.
- Optional line items and customer details remain supported for exceptional cases.
- Admin bulk operations remain accessible and are not moved into rep-facing controls.
