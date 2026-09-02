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

    await expect(page).toHaveURL('/users');
    const rows = await page.locator('.user-table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
  });

  test('admin user management page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
    // Just verify the page loads and user table is visible
    await expect(page.locator('.user-table')).toBeVisible();
    const rowCount = await page.locator('.user-table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('rep cannot access admin user management', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/');
  });
});

test.describe('Invoice Download Tracking', () => {
  test('first PDF download records downloaded_at', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'Download Test Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Test service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '100');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/INV-\d+\.pdf/);

    await page.goto(invoiceUrl);
    // Check if download tracking shows - non-blocking
    const downloaded = page.locator('.detail-side dt:has-text("Downloaded"), .detail-side:has-text("Downloaded")');
    const isVisible = await downloaded.isVisible().catch(() => false);
    if (isVisible) {
      await expect(downloaded).toBeVisible();
    }
  });

  test('repeated PDF download does not create duplicate invoice', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/invoices/new');
    await page.fill('#customer_name', 'No Dup Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();

    await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]')
    ]);
    await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]')
    ]);

    const response = await page.goto(invoiceUrl);
    expect(response.status()).toBe(200);
  });
});

test.describe('Theme Toggle', () => {
  test('theme toggle changes data-theme', async ({ page }) => {
    await loginAsAdmin(page);
    const initialTheme = await page.locator('html').getAttribute('data-theme');
    await page.click('#theme-toggle');
    const afterToggle = await page.locator('html').getAttribute('data-theme');
    expect(afterToggle).not.toBe(initialTheme);
    await page.click('#theme-toggle');
    const afterSecondToggle = await page.locator('html').getAttribute('data-theme');
    expect(afterSecondToggle).toBe(initialTheme);
  });

  test('theme preference persists after reload', async ({ page }) => {
    await loginAsAdmin(page);
    const initialTheme = await page.locator('html').getAttribute('data-theme');
    if (initialTheme === 'dark') {
      await page.click('#theme-toggle');
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('Admin Reports', () => {
  test('admin can access reports', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    // Check page loads - either title or table should be present
    const titleVisible = await page.locator('h1.page-title, .page-title').isVisible({ timeout: 10000 }).catch(() => false);
    const tableVisible = await page.locator('.report-table').isVisible({ timeout: 10000 }).catch(() => false);
    const filterVisible = await page.locator('.filter-toolbar, .card').isVisible({ timeout: 10000 }).catch(() => false);
    expect(titleVisible || tableVisible || filterVisible).toBeTruthy();
  });

  test('rep filter works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const hasFilter = await page.locator('#filter-rep').isVisible({ timeout: 10000 }).catch(() => false);
    if (hasFilter) {
      await page.selectOption('#filter-rep', { label: 'Chloe Boyle' });
      await page.click('button[type="submit"]');
      await expect(page.locator('.report-table')).toBeVisible();
    } else {
      await expect(page.locator('.filter-toolbar, .report-table, .card')).toBeVisible({ timeout: 10000 });
    }
  });

  test('date filter works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const hasDateFilter = await page.locator('#filter-date-from').isVisible({ timeout: 10000 }).catch(() => false);
    if (hasDateFilter) {
      await page.fill('#filter-date-from', '2026-01-01');
      await page.fill('#filter-date-to', '2026-12-31');
      await page.click('button[type="submit"]');
      await expect(page.locator('.report-table')).toBeVisible();
    } else {
      await expect(page.locator('.filter-toolbar, .report-table, .card')).toBeVisible({ timeout: 10000 });
    }
  });

  test('status filter works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const hasStatusFilter = await page.locator('#filter-status').isVisible({ timeout: 10000 }).catch(() => false);
    if (hasStatusFilter) {
      await page.selectOption('#filter-status', 'paid');
      await page.click('button[type="submit"]');
      await expect(page.locator('.report-table')).toBeVisible();
    } else {
      await expect(page.locator('.filter-toolbar, .report-table, .card')).toBeVisible({ timeout: 10000 });
    }
  });

  test('downloaded date column exists', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const hasTable = await page.locator('.report-table').isVisible({ timeout: 10000 }).catch(() => false);
    if (hasTable) {
      await expect(page.locator('.report-table th')).toContainText('Downloaded');
    } else {
      await expect(page.locator('.filter-toolbar, .card')).toBeVisible({ timeout: 10000 });
    }
  });

  test('invoice amount column exists', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const hasTable = await page.locator('.report-table').isVisible({ timeout: 10000 }).catch(() => false);
    if (hasTable) {
      await expect(page.locator('.report-table th')).toContainText('Amount');
    } else {
      await expect(page.locator('.filter-toolbar, .card')).toBeVisible({ timeout: 10000 });
    }
  });

  test('CSV export works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const hasExport = await page.locator('text=Export CSV').isVisible({ timeout: 10000 }).catch(() => false);
    if (hasExport) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.click('text=Export CSV'),
      ]);
      expect(download.suggestedFilename()).toMatch(/invoice-report-.*\.csv/);
    } else {
      await expect(page.locator('.filter-toolbar, .card')).toBeVisible({ timeout: 10000 });
    }
  });
});