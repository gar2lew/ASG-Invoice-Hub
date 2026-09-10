# Rollback Runbook

**Last updated:** 2026-09-09  
**App:** ASG Invoice Hub  
**Production URL:** https://asg-invoice-hub.vercel.app

---

## 1. Identify Current Production Commit

```bash
git log -1 --oneline
git rev-parse HEAD
```

Compare with Vercel deployment commit (see Section 5).

---

## 2. Find Previous Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com) → `asg-invoice-hub` → Deployments
2. Identify the deployment currently marked **Production**
3. Note its commit SHA and timestamp
4. Find the previous production deployment (one below it)

---

## 3. Git Tag Rollback Procedure

If the previous release was tagged (e.g., `v0.9.0`):

```bash
git log --oneline -20
git tag -l
git show v0.9.0 --stat
```

To roll back to a specific commit:

```bash
git checkout -b rollback/v1.0.0 <previous-commit-sha>
git push origin rollback/v1.0.0
```

Then in Vercel, deploy the `rollback/v1.0.0` branch to Production.

---

## 4. Vercel Rollback / Redeploy

### Option A: Redeploy Previous Build (Fastest)
1. Vercel Dashboard → Deployments
2. Find the previous production deployment
3. Click **Redeploy**
4. Confirm production domain assignment

### Option B: Promote Preview to Production
1. Deploy rollback branch to preview
2. Test preview URL
3. Promote to Production via Vercel Dashboard

### Option C: CLI Redeploy
```bash
vercel --prod --force
# or for a specific commit:
vercel deploy --prod --meta commitSha=<sha>
```

---

## 5. Database Cautions

⚠️ **NEVER** run `DROP TABLE`, `TRUNCATE`, or `DELETE` on production without:
- A verified backup taken within the last 24 hours
- A second person reviewing the command
- A tested restore procedure on a temporary database

⚠️ **NEVER** rollback a migration that has already been applied to production without checking if data was written in the new schema.

If a migration must be reversed:
1. Take a backup first (see ProductionBackupRunbook.md)
2. Test the reverse migration on a temporary database
3. Apply during low-traffic window
4. Verify app still works after reversal

---

## 6. Verify Rollback Worked

After rollback:

```bash
# Confirm production commit
curl -s https://asg-invoice-hub.vercel.app/api/health
# Check Vercel deployment status
vercel ls asg-invoice-hub
```

Manual checks:
- [ ] Admin login works
- [ ] Rep login works
- [ ] Invoice list loads
- [ ] PDF generation works
- [ ] Reports load
- [ ] No console errors

---

## 7. Explicit Warnings

| Action | Risk |
|--------|------|
| `git push --force` to main | **NEVER** — rewrites history, breaks audit trail |
| `DROP TABLE` on production | **NEVER** without backup + second reviewer |
| Deleting Vercel deployment | Safe — does not affect running production |
| Rolling back DB schema | Only with tested reverse migration |
| Reverting commit with migration | Must also reverse migration carefully |

---

## 8. Emergency Contacts

- **Vercel Support:** https://vercel.com/support
- **Neon Support:** https://neon.tech/support
- **Git history:** `git reflog` (local recovery up to 90 days)

---

## 9. Post-Rollback

After successful rollback:
1. Tag the rollback commit: `git tag -a v1.0.1 -m "Rollback from v1.0.0"`
2. Investigate root cause of v1.0.0 issue
3. Fix forward on a feature branch
4. Test thoroughly before re-releasing
