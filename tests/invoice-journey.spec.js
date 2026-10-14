const { test, expect } = require('@playwright/test');

test.describe('Simplified invoice journey', () => {
  test('save once, find invoice in history, and download its PDF', async ({ page }) => {
    await page.goto('/invoices/new');
    const form = page.locator('#invoice-form');
    await expect(form.locator('button[type="submit"]')).toHaveCount(1);
    await expect(form.locator('button[type="submit"]')).toHaveText('Save invoice');
    await expect(form.locator('button[type="button"]')).toHaveCount(0);
    await expect(form.locator('button[type="submit"]')).toHaveCount(1);
    await expect(form.locator('.invoice-more-options')).toBeVisible();
    await expect(form.locator('.invoice-more-options')).toHaveJSProperty('open', false);

    await page.fill('#week_start', '2026-08-24');
    await page.locator('.weekday[data-day="Mon"] .day-btn[data-state="full"]').click();
    await expect(page.locator('[data-line-item-type="wages"] input[name="item_rate"]')).toHaveValue('166.67');
    await page.locator('.invoice-more-options summary').click();
    await page.fill('#customer_email', 'accounts@example.com');
    await page.click('#submit-draft');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    await expect(page.locator('.page-title')).toContainText(/INV-/);
    await expect(page.getByRole('link', { name: 'Download PDF' })).toBeVisible();
    await expect(page.locator('form[action$="/send"] button')).toHaveCount(0);
    await expect(page.getByText('More actions')).toBeVisible();
    await expect(page.locator('.flash-warn')).toContainText('Email delivery is not configured');

    const invoiceUrl = page.url();
    const invoicesBeforeDownload = await page.locator('.page-title').textContent();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Download PDF' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/Contractor Invoice.*\.pdf/);
    await expect(page).toHaveURL(invoiceUrl);
    await expect(page.locator('.page-title')).toHaveText(invoicesBeforeDownload);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Invoice history' })).toBeVisible();
    const invoiceId = new URL(invoiceUrl).pathname.match(/\/invoices\/(\d+)$/)[1];
    await expect(page.locator(`table.table a[href="/invoices/${invoiceId}"]`)).toBeVisible();
    await page.locator('[data-filter-status]').selectOption('paid');
    await expect(page.locator(`table.table tr[data-status="draft"]:has(a[href="/invoices/${invoiceId}"])`)).toBeHidden();
    await page.locator('[data-filter-status]').selectOption('');
    await expect(page.locator(`table.table tr[data-status="draft"]:has(a[href="/invoices/${invoiceId}"])`)).toBeVisible();
  });

  test('reps see only their own invoices and cannot bulk-delete', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Invoice history' })).toBeVisible();
    await expect(page.locator('#bulk-delete-invoices')).toHaveCount(0);
    await expect(page.locator('[data-select-all]')).toHaveCount(0);
  });

  test('invoice history keeps one table with all statuses in newest-first order', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Invoice history' })).toBeVisible();
    await expect(page.locator('table.table')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Paid invoices' })).toHaveCount(0);
    const dates = await page.locator('table.table tbody tr[data-status] td:nth-child(4)').evaluateAll((cells) =>
      cells.map((cell) => {
        const [day, month, year] = cell.textContent.trim().split('/').map(Number);
        return new Date(year, month - 1, day).getTime();
      })
    );
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
});
