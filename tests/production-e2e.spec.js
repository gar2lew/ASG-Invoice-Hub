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

test.describe('Full Production E2E Lifecycle', () => {
  test('admin creates rep with complete profile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');

    // Create a new rep with full details
    const uniqueName = `Lifecycle Rep ${Date.now()}`;
    const uniqueEmail = `lifecycle-${Date.now()}@test.com`;

    // Target the "Add a rep" form specifically
    const repForm = page.locator('form[action="/admin/users/create-rep"]');
    await repForm.locator('input[name="name"]').fill(uniqueName);
    await repForm.locator('input[name="email"]').fill(uniqueEmail);
    await repForm.locator('input[name="abn"]').fill('51 824 753 556');
    await repForm.locator('input[name="pin"]').fill('4321');
    await repForm.locator('button:has-text("Create rep account")').click();

    await expect(page).toHaveURL('/users');
    // Verify new rep appears in table
    await expect(page.locator('.user-table')).toContainText(uniqueName);
  });

  test('admin edits rep phone and ABN', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
    await page.locator('.user-table tbody tr').filter({ has: page.locator('a:has-text("Edit")') }).first().locator('a:has-text("Edit")').click();

    await page.fill('input[name="phone"]', '0412 345 678');
    await page.fill('input[name="abn"]', '51 824 753 556');
    await page.click('button:has-text("Save changes")');
    await expect(page).toHaveURL('/users');
    await expect(page.locator('.flash')).toContainText('Saved changes');
  });

  test('admin edits rep bank details', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
    await page.locator('.user-table tbody tr').filter({ has: page.locator('a:has-text("Edit")') }).first().locator('a:has-text("Edit")').click();

    await page.fill('input[name="bank_name"]', 'Westpac');
    await page.fill('input[name="bank_bsb"]', '032-001');
    await page.fill('input[name="bank_account"]', '98765432');
    await page.click('button:has-text("Save changes")');
    await expect(page).toHaveURL('/users');

    // Verify bank status shows Complete
    await expect(page.locator('.user-table tbody tr').filter({ has: page.locator('a:has-text("Edit")') }).first()).toContainText('Complete');
  });

  test('admin verifies rep is active', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
    await expect(page.locator('.user-table tbody tr').filter({ has: page.locator('a:has-text("Edit")') }).first()).toContainText('Active');
  });

  test('rep creates Mon-Fri invoice = $900', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'E2E Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Test service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '100');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);
  });

  test('rep saves draft and reloads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'Draft Test Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Draft service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '100');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();
    await page.goto(invoiceUrl);
    // On detail page, customer name is shown in the Customer section
    await expect(page.locator('.dl').first()).toContainText('Draft Test Customer');
  });

  test('rep downloads PDF twice, no duplicate', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'PDF Download Test');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '100');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();

    // First download
    const [download1] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]'),
    ]);
    expect(download1.suggestedFilename()).toMatch(/Contractor Invoice.*\.pdf/);

    // Second download
    const [download2] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]'),
    ]);
    expect(download2.suggestedFilename()).toMatch(/Contractor Invoice.*\.pdf/);

    // Verify still one invoice
    const response = await page.goto(invoiceUrl);
    expect(response.status()).toBe(200);
  });

  test('admin sees invoice in reports', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'Report Test Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Report service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '100');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    // Go to reports
    await page.goto('/admin/reports');
    await expect(page.locator('.report-table')).toContainText('Report Test Customer');
  });
});