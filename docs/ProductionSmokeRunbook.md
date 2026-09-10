# Production Smoke Runbook

## When to Use
- After every deployment to production
- After database restore
- After major config changes
- Before pilot rollout begins

---

## ADMIN CHECKS

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit `/login` | Login form renders |
| 2 | Log in as admin | Redirect to dashboard |
| 3 | Click **Users** in admin nav | Users table loads |
| 4 | Verify rep rows show **Active** badge | Status column visible |
| 5 | Click **Edit** on a rep | Edit form pre-populates |
| 6 | Change phone, click Save | Success flash, value persists |
| 7 | Click **Reports** | Report table loads |
| 8 | Filter by rep | Results filter correctly |
| 9 | Click **Export CSV** | CSV downloads |

## REP CHECKS

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit `/login` | Login form renders |
| 2 | Select rep name, enter PIN, login | Redirect to dashboard |
| 3 | Click **New invoice** | Invoice form loads |
| 4 | Select **Mon-Fri** | Total = $900.00 |
| 5 | Add Saturday | Total = $1,000.00 |
| 6 | Fill customer name | Form validates |
| 7 | Click **Save draft** | Success, invoice in list |
| 8 | Reload page | Draft still present |
| 9 | Click **Edit** on draft | Form pre-populates |
| 10 | Click **Download PDF** | PDF downloads |
| 11 | Verify PDF filename | `Contractor Invoice - [Name] - [Date] - $[Amount].pdf` |

## PDF CHECKS

Open the downloaded PDF and verify:

- [ ] Rep name correct
- [ ] Rep ABN correct
- [ ] Rep email correct
- [ ] Rep phone shown (if provided)
- [ ] Bank name correct
- [ ] BSB correct
- [ ] Account number correct
- [ ] Bill To company correct
- [ ] Amount matches invoice
- [ ] Issue date correct
- [ ] No Due Date shown
- [ ] Filename format correct

## REPORTING CHECKS

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as admin | Dashboard loads |
| 2 | Click **Reports** | Invoice list loads |
| 3 | Find test invoice | Amount correct |
| 4 | Verify rep name | Matches creator |
| 5 | Verify status | `draft` or `sent` |
| 6 | Verify created date | Today's date |
| 7 | Download PDF from report | Download date populates |

## EMAIL CHECKS

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open a draft invoice | Invoice detail loads |
| 2 | Click **Send & email** | Success flash |
| 3 | Verify status changes | Status = `sent` |
| 4 | Check `sent_at` timestamp | Populated |
| 5 | Verify recipient received | Check inbox |

## INACTIVE REP CHECKS

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as admin | Dashboard loads |
| 2 | Go to Users | Table loads |
| 3 | Click **Deactivate** on test rep | Confirm dialog |
| 4 | Confirm | Rep shows **Inactive** |
| 5 | Log out, try logging in as rep | Error: account deactivated |
| 6 | Log back in as admin | Dashboard loads |
| 7 | Click **Reactivate** on rep | Rep shows **Active** |

## FAILURE PROCEDURE

If any check fails:
1. **Do not proceed** to next phase
2. Capture screenshot / error message
3. Check Vercel logs: `vercel logs --prod`
4. Check browser console for JS errors
5. Report issue with: step number, expected, actual, timestamp
6. Rollback if data integrity is at risk (see RollbackRunbook.md)