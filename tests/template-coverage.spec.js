const { test, expect } = require('@playwright/test');

const ADMIN_USER = process.env.E2E_ADMIN_USERNAME || 'e2e_admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD || 'e2e_pass_123';

async function loginAsAdmin(page) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('.login-admin-form [name="username"]', ADMIN_USER);
  await page.fill('.login-admin-form [name="password"]', ADMIN_PASS);
  await page.click('.login-admin-form button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('ASG Template Coverage', () => {
  test('ASG company data is correct in settings', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');
    await expect(page.locator('input[name="company_name"]')).toHaveValue('ASG Operations Pty Ltd');
    await expect(page.locator('input[name="company_abn"]')).toHaveValue('43 663 126 725');
    await expect(page.locator('input[name="company_address"]')).toHaveValue('14C, 1 The Esplanade, Mount Pleasant WA 6153');
    await expect(page.locator('input[name="company_phone"]')).toHaveValue('08 6147 7927');
    await expect(page.locator('input[name="company_email"]')).toHaveValue('Natalie@sjssolutionscorp.com.au');
  });

  test('ASG invoice shows correct Bill To on detail page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'ASG Test Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Test service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '100');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    // Verify customer name on detail page - first .dl is Customer section
    await expect(page.locator('.dl').first()).toContainText('ASG Test Customer');
  });

  test('ASG PDF download has correct filename', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'ASG PDF Test');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '100');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/Contractor Invoice.*\.pdf/);
  });
});

test.describe('SJS Template Coverage', () => {
  test('SJS invoice shows correct Bill To on detail page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    // Switch to SJS template
    await page.click('.tpl[data-template="sjs"]');
    await page.fill('#customer_name', 'SJS Test Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    // Verify customer name on detail page - first .dl is Customer section
    await expect(page.locator('.dl').first()).toContainText('SJS Test Customer');
  });

  test('SJS PDF download has correct filename', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="sjs"]');
    await page.fill('#customer_name', 'SJS PDF Test');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/Contractor Invoice.*\.pdf/);
  });

  test('SJS template does not contaminate ASG', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="sjs"]');
    await page.fill('#customer_name', 'SJS Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    // Now create ASG invoice - switching to ASG template fills ASG company name
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="asg"]');
    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
  });
});
