# Production Backup Runbook

## PostgreSQL Provider

Based on `DATABASE_URL` host metadata: **Neon** (neon.tech) — serverless PostgreSQL with built-in point-in-time recovery (PITR).

## Backup Mechanism

### Automatic (Neon)
- **Point-in-Time Recovery (PITR)**: Continuous WAL archiving, 7-day retention on free tier, 30-day on paid
- **Branch-based snapshots**: Instant copy-on-write branches for testing
- **No manual cron needed** — built into Neon

### Manual Export (any provider)
```bash
# Full schema + data dump
pg_dump "$DATABASE_URL" > backup_$(date +%F_%H-%M).sql

# Schema only
pg_dump --schema-only "$DATABASE_URL" > schema_$(date +%F).sql

# Data only (for seeding test DBs)
pg_dump --data-only "$DATABASE_URL" > data_$(date +%F).sql
```

## Restore Mechanism

### Neon (preferred)
1. **PITR**: Create a branch at timestamp → point `DATABASE_URL` to branch endpoint
2. **Branch from backup**: `neon branches create --parent main --name restore-<timestamp>`

### Generic PostgreSQL
```bash
# Restore into fresh database
createdb restore_test
psql -d restore_test < backup_2026-09-10_14-30.sql

# Or via DATABASE_URL
psql "$DATABASE_URL" < backup_2026-09-10_14-30.sql
```

## Backup Verification

```bash
# 1. Verify file exists and is non-empty
ls -lh backup_*.sql

# 2. Quick syntax check
head -20 backup_*.sql | grep -E "(CREATE TABLE|INSERT INTO|COPY)"

# 3. Test restore into isolated DB (CI-safe)
createdb verify_restore_$(date +%s)
psql -d verify_restore_* < backup_*.sql 2>&1 | tail -5
dropdb verify_restore_*
```

## Point App to Restored DB

1. Update `DATABASE_URL` in Vercel Environment Variables
2. Redeploy: `vercel --prod` (or push to main)
3. Verify health: `GET /health` or visit dashboard

## What Must Never Be Overwritten

| Resource | Protection |
|----------|------------|
| Production `DATABASE_URL` | Never hardcode; only via Vercel env |
| `SECRET` / `SESSION_SECRET` | Never in repo; only Vercel env |
| `ADMIN_PASSWORD` | Only via Vercel env; never default |
| `pg_dump` output files | Never commit to git (add to `.gitignore`) |
| Live invoice data | Only delete via admin UI with confirmation |

## Manual Backup Procedure (Run Before Major Changes)

```bash
# 1. Set env (or use .env.production.local)
export DATABASE_URL="postgres://..."

# 2. Create timestamped backup
BACKUP_FILE="prod_backup_$(date +%F_%H-%M-%S).sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# 3. Verify
echo "Backup size: $(wc -c < "$BACKUP_FILE") bytes"
head -5 "$BACKUP_FILE"

# 4. Store securely (encrypted S3, 1Password, etc.)
# DO NOT leave on local disk unencrypted
```

## Emergency Restore Steps

1. **Stop writes**: Set app to maintenance (Vercel: Password Protection or disable route)
2. **Create restore branch** (Neon): `neon branches create --parent main --name emergency-restore-$(date +%s)`
3. **Point app to branch**: Update `DATABASE_URL` in Vercel to branch endpoint
4. **Verify**: Admin login → Reports → confirm data integrity
5. **Communicate**: Notify team of rollback
6. **Monitor**: Watch logs for 15 min