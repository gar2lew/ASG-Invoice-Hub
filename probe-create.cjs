const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'https://asg-invoice-hub.vercel.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const api = { reqs: [], res: [] };
  page.on('request', (r) => { if (r.url().includes('/api/invoices')) api.reqs.push(r.url()); });
  page.on('response', (r) => {
    if (r.url().includes('/api/invoices')) api.res.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(`${BASE}/invoices/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/login');
  await page.selectOption('select[name="user_id"]', { label: 'Chloe Boyle' });
  await page.fill('input[name="pin"]', '1234');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(invoices\/new)?$/, { timeout: 20000 });
  await page.goto(`${BASE}/invoices/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form#invoice-form');

  await page.click('button.tpl[data-template="asg"]');
  await page.fill('#customer_name', 'PROBE');
  await page.fill('#week_start', '2026-08-31');
  for (const d of ['Mon','Tue','Wed','Thu','Fri','Sat']) await page.check(`#calc-days input[data-day="${d}"]`);
  await page.click('#calc-add');
  await page.waitForTimeout(200);

  console.log('Submitting via #submit-draft...');
  const t0 = Date.now();
  let nav = page.waitForURL(/\/invoices\/\d+$/, { timeout: 50000 }).catch((e) => 'NAV_TIMEOUT');
  await page.click('#submit-draft');
  const navResult = await nav;
  console.log('nav result:', navResult, 'elapsed(ms):', Date.now() - t0);

  console.log('API responses during submit:', api.res);
  const url = page.url();
  console.log('final url:', url);
  const html = await page.content();
  fs.writeFileSync('probe-detail.html', html);
  // quick check: does it contain the stylesheet link + status badge?
  console.log('has /css/style.css link:', html.includes('/css/style.css'));
  console.log('has status badge class:', /badge-/.test(html));
  console.log('has unstyled marker (shell class):', html.includes('class="shell"'));
  console.log('html length:', html.length);
  await browser.close();
})();
