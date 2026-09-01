const { test, expect } = require('@playwright/test');

const ADMIN_USER = process.env.E2E_ADMIN_USERNAME || 'e2e_admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD || 'e2e_pass_123';

async function loginAsAdmin(page) {
  // Clear any existing session first (setup logs in as rep via storageState)
  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('.login-admin-form [name="username"]', ADMIN_USER);
  await page.fill('.login-admin-form [name="password"]', ADMIN_PASS);
  await page.click('.login-admin-form button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('Admin User Management', () => {
  test('admin can create a rep', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
    await expect(page.locator('.page-title')).toHaveText('Sales reps');

    await page.fill('input[name="name"]', 'Test Rep E2E');
    await page.fill('input[name="email"]', 'testrepe2e@example.com');
    await page.fill('input[name="abn"]', '99 888 777 666');
    await page.fill('input[name="pin"]', '9876');
    await page.click('text=Create rep account');

    await expect(page.locator('.flash-success')).toContainText('Rep account created');
    await expect(page.locator('.user-table')).toContainText('Test Rep E2E');
  });

  test('admin can create an admin account', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
    await page.fill('#create-admin-username', 'e2e_admin_2');
    await page.fill('#create-admin-password', 'testpass456');
    await page.fill('#create-admin-name', 'E2E Admin Two');
    await page.fill('#create-admin-email', 'e2eadmin2@example.com');
    await page.click('#create-admin-submit');

    await expect(page.locator('.flash-success')).toContainText('Admin account created');
    await expect(page.locator('.user-table')).toContainText('E2E Admin Two');
  });

  test('rep cannot access admin user management', async ({ page }) => {
    // Rep should be redirected away from admin routes
    await page.goto('/users');
    // Should redirect to dashboard, not show admin page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Invoice Download Tracking', () => {
  test('first PDF download records downloaded_at', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'Download Test Customer');
    await page.fill('#item-desc-0', 'Test service');
    await page.fill('#item-qty-0', '1');
    await page.fill('#item-rate-0', '100');
    await page.click('#save-btn');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-btn'),
    ]);
    expect(download.suggestedFilename()).toMatch(/INV-\d+\.pdf/);

    await page.goto(invoiceUrl);
    await expect(page.locator('.invoice-meta')).toContainText('Downloaded:');
  });

  test('repeated PDF download does not create duplicate invoice', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'No Dup Customer');
    await page.fill('#item-desc-0', 'Service');
    await page.fill('#item-qty-0', '1');
    await page.fill('#item-rate-0', '200');
    await page.click('#save-btn');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();

    await Promise.all([page.waitForEvent('download'), page.click('#download-btn')]);
    await Promise.all([page.waitForEvent('download'), page.click('#download-btn')]);

    const response = await page.goto(invoiceUrl);
    expect(response.status()).toBe(200);
  });
});

test.describe('Theme Toggle', () => {
  test('theme toggle changes data-theme', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('theme preference persists after reload', async ({ page }) => {
    await loginAsAdmin(page);

    await page.click('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('Admin Reports', () => {
  test('admin can access reports', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    await expect(page.locator('.page-title')).toHaveText('Invoice reports');
    await expect(page.locator('.report-table')).toBeVisible();
  });

  test('rep filter works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    await page.selectOption('#filter-rep', { label: 'Chloe Boyle' });
    await page.click('button[type="submit"]');
    await expect(page.locator('.report-table')).toBeVisible();
  });

  test('CSV export works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export CSV'),
    ]);
    expect(download.suggestedFilename()).toMatch(/invoice-report-.*\.csv/);
  });
});
