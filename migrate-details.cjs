require('dotenv').config({ path: '.env.production' });
// Prefer explicitly supplied prod DATABASE_URL if present in shell env
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(2); }
const { Pool } = require('pg');
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1 });

(async () => {
  const before = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='invoice_items' AND column_name='details'"
  );
  console.log('before: details column present =', before.rows.length > 0);
  await pool.query("ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '[]'::jsonb");
  const after = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='invoice_items' AND column_name='details'"
  );
  console.log('after: details column =', JSON.stringify(after.rows));
  await pool.end();
  console.log('MIGRATION OK');
})().catch((e) => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
