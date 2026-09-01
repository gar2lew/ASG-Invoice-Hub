# AGENTS.md

## A. Project Purpose

The REP Invoice System is a web application for managing invoices, wages, and PDF generation for Australian businesses (ASG and SJS). It uses Express/EJS for the server, Playwright for end-to-end testing, and is designed for deployment via Docker and Vercel.

## B. Core Engineering Principles

- Evidence before conclusions.
- Read actual source before editing.
- Never reconstruct source from remembered tool output.
- Never claim a mutation succeeded without verifying the file.
- Never claim a fix works without running appropriate validation.
- Prefer root-cause fixes over symptom patches.
- Prefer extension over replacement.
- Prefer composition over duplication.
- Avoid unnecessary refactoring.
- Do not touch unrelated code during a focused sprint.

## C. Mandatory Investigation Phase

Before changing code:
1. Inspect current implementation.
2. Reproduce or understand the issue.
3. Identify root cause.
4. Classify the issue:
   - bug
   - architecture issue
   - missing implementation
   - test issue
   - data issue
   - environment issue
   - design issue
5. State intended approach.
6. Only then modify code.

For trivial edits, the investigation may be concise, but it must still happen.

## D. Source-of-Truth Rule

The filesystem is the source of truth.

Never rely on:
- remembered source
- previous tool summaries
- previous intended patches
- assumptions that a mutation succeeded

Before modifying a file:
READ IT.

After modifying a file:
VERIFY IT.

For code changes, require:
```bash
git diff -- <file>
```
or equivalent verification.

## E. Scope Control

Every sprint must have:
- Objective
- Constraints
- Implementation
- Validation
- Report
- STOP

Do not automatically move to another task.
Do not implement "nice to have" features unless explicitly included.
Do not broaden scope simply because related problems are discovered.
Instead record unrelated findings in:
- TECH_DEBT.md
- or ROADMAP.md

## F. Architecture Rules

- Never duplicate business logic.
- Never duplicate existing helpers unnecessarily.
- Prefer shared utilities.
- Prefer shared components.
- Prefer existing patterns over introducing a new architecture.
- Do not replace stable modules without a documented reason.
- Preserve backwards compatibility unless the sprint explicitly permits breaking changes.

## G. Production Safety Rules

Do not casually modify:
- invoice calculations
- wage calculations
- PDF rendering
- invoice generation
- duplicate invoice prevention
- authentication
- database schema
- database migrations
- financial totals
- existing customer/invoice data

Changes in these areas require:
* root-cause evidence
* targeted tests
* regression verification

## H. Test Rules

Never state:
- Fixed
- Working
- Complete
- Verified
- Resolved

unless appropriate validation has actually run.

Use status language:
- Implemented — Verified
- Implemented — Not Yet Verified
- Investigated — No Change Required
- Blocked — Evidence Provided

Require scope-relevant validation.

For code work, normally include:
- syntax/type validation where relevant
- unit tests where relevant
- Playwright/E2E tests where relevant
- build/startup verification where relevant
- manual verification where relevant

Do NOT require unrelated manual checks.

Example:
A Playwright-only authentication fix does not need responsive UI testing.
A UI sprint should include responsive/manual verification.

## I. Anti-Mock Rule

Do not fake application functionality.
Do not replace real behaviour with:
- fake uploads
- fake database writes
- fake success states
- fake persistence
- placeholder calculations
- mocked production behaviour

Mocks are acceptable only inside tests where appropriate.

## J. Test Modification Rules

Do not make failing tests pass by:
- arbitrary sleeps
- inflated timeouts
- broad retries
- test.skip()
- weakening assertions
- removing regression coverage

unless there is a documented, legitimate reason.

Tests may be corrected if the test itself is wrong.

Example:
Waiting for a DOM element that does not exist is a test bug.
Fix the test to observe the real application behaviour.

## K. Playwright Rules

Authentication setup must be deterministic.
Storage state must be explicit.
Test projects must not accidentally inherit inappropriate auth state.
Admin-login tests must deliberately start unauthenticated.
Do not start duplicate web servers.
Port 3110 must have one clear owner during E2E execution.
Run failing tests in isolation before making broad changes.
Run targeted regression tests before the full suite.

## L. PDF Protection Rules

The PDF module has undergone significant recovery work.
Future changes must preserve:
- money()
- meta()
- drawItemsTable()
- renderStandard()
- renderCompact()
- renderInvoice()
- ASG/SJS Bill To handling
- wage detail rendering
- invoice notes
- customer details
- template switching
- repeat-download behaviour
- duplicate-invoice protection

The current PDF Playwright regression suite should remain protected.

## M. UI / Design Rules

For future UI work:
- Reuse the existing design system.
- Do not create isolated styling systems for individual pages.
- Prefer shared CSS variables, utilities, components, and patterns.
- Preserve accessibility.
- Support desktop and mobile layouts where the application requires them.
- Do not redesign unrelated screens during a focused UI sprint.

## N. File Mutation Verification

After intended edits:
```bash
git status
git diff
```
For critical files:
```bash
git diff -- path/to/file
```
Never report a file as changed if the diff does not prove it.
If a patch fails because of escaping or source mismatch:
```text
STOP
READ THE ACTUAL FILE
PATCH AGAINST THE LITERAL SOURCE
```
Never repeatedly patch remembered strings.

## O. Documentation Rules

After meaningful sprints, update only relevant documentation.
Use:
- docs/DevelopmentJournal.md
- docs/DecisionLog.md
- ROADMAP.md
- TECH_DEBT.md
- CHANGELOG.md
Not every file needs updating every sprint.
Avoid documentation churn.

## P. Development Journal Rules

Each meaningful sprint should append:
- Date
- Sprint / Version
- Objective
- Files Changed
- Root Cause / Reason
- Implementation Summary
- Validation
- Problems Found
- Problems Remaining
- Next Recommended Sprint

## Q. Decision Log Rules

Only add decisions that matter long term.
Format:
```text
Decision XXX
Date
Decision
Reason
Alternatives Considered
Why Alternatives Were Rejected
Consequences
```
Do not log trivial implementation details.

## R. Completion Report Standard

Every coding sprint must finish with:
1. Status
2. Root Cause
3. Files Actually Modified
4. Implementation
5. Validation Commands
6. Test Results
7. Remaining Issues
8. Documentation Updated
9. ONE Recommended Next Sprint

If verification did not run successfully, say so.

## S. STOP Rule

STOP AFTER THE ASSIGNED SPRINT.

Do not automatically continue into:
- cleanup
- optimisation
- redesign
- additional features
- unrelated failing tests

Record them and wait for the next instruction.