const { test, expect } = require('@playwright/test');

test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Invoice Edit Route', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    let isDashboard = false;
    try {
      await page.waitForSelector('text=Dashboard', { timeout: 5000 });
      isDashboard = true;
    } catch (e) {}
    if (!isDashboard) {
      await page.goto('/login');
      await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
      await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
      await page.fill('input[name="pin"]', '1234');
      await page.click('button:has-text("Sign in")');
      await page.waitForURL('**/', { waitUntil: 'networkidle' });
    }
  });

  test('edit save uses PUT and updates same invoice', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached' });

    await page.fill('#customer_name', 'PUT Test Customer');
    await page.fill('#customer_address', '123 PUT St');

    const days = ['Mon', 'Tue', 'Wed'];
    for (const day of days) {
      const btn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn[data-state="full"]`);
      await btn.click();
    }
    await page.click('#calc-add');

    // Save as draft
    await page.click('#submit-draft');
    await page.waitForURL(/\/invoices\/(\d+)/);
    const viewUrl = page.url();
    const invoiceIdMatch = viewUrl.match(/\/invoices\/(\d+)/);
    const invoiceId = invoiceIdMatch[1];

    // Go to edit page
    await page.goto(`/invoices/${invoiceId}/edit`);
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });

    // Verify pre-populated customer data
    const customerName = await page.locator('#customer_name').inputValue();
    expect(customerName).toBe('PUT Test Customer');

    // Verify wage line was restored
    const lineItems = page.locator('#lines .line-row:not(.line-head):not(.wage-details)');
    await expect(lineItems).toHaveCount(1);

    // Change notes
    await page.fill('#notes', 'Updated notes');

    // Save edit - should use PUT
    const putResponse = page.waitForResponse((resp) => {
      return resp.url().includes('/api/invoices/') && resp.request().method() === 'PUT';
    }, { timeout: 15000 });
    await page.click('#submit-draft');
    const response = await putResponse;
    expect(response.status()).toBe(200);

    // Should redirect back to same invoice detail
    await page.waitForURL(`/invoices/${invoiceId}`);

    // Verify the notes were saved
    const notesText = await page.locator('.detail-notes').textContent();
    expect(notesText).toContain('Updated notes');
  });

  test('draft invoice shows Edit invoice button', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached' });

    await page.fill('#customer_name', 'Draft Test Customer');
    await page.fill('#customer_address', '123 Draft St');

    const days = ['Mon', 'Tue', 'Wed'];
    for (const day of days) {
      const btn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn[data-state="full"]`);
      await btn.click();
    }
    await page.click('#calc-add');

    await page.click('#submit-draft');
    await page.waitForURL(/\/invoices\/(\d+)/);

    const editBtn = page.locator('a[href*="/edit"]', { hasText: 'Edit invoice' });
    await expect(editBtn).toBeVisible();
  });

  test('sent invoice hides Edit invoice button', async ({ page }) => {
    test.skip(true, 'SMTP not configured in E2E - cannot test /send route');
  });

  test('paid invoice hides Edit invoice button', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached' });

    await page.fill('#customer_name', 'Paid Test Customer');
    await page.fill('#customer_address', '123 Paid St');

    const days = ['Mon', 'Tue', 'Wed'];
    for (const day of days) {
      const btn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn[data-state="full"]`);
      await btn.click();
    }
    await page.click('#calc-add');

    await page.click('#submit-draft');
    await page.waitForURL(/\/invoices\/(\d+)/);
    const viewUrl = page.url();
    const invoiceIdMatch = viewUrl.match(/\/invoices\/(\d+)/);
    const invoiceId = invoiceIdMatch[1];

    // Mark as paid via API
    await page.evaluate(async (id) => {
      await fetch(`/invoices/${id}/paid`, { method: 'POST' });
    }, invoiceId);

    await page.goto(`/invoices/${invoiceId}`);

    const editBtn = page.locator('a[href*="/edit"]', { hasText: 'Edit invoice' });
    await expect(editBtn).not.toBeVisible();
  });
});
