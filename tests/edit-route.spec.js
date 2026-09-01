const { test, expect } = require('@playwright/test');

// Use the storage state from the auth.setup test
test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Invoice Edit Route', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we are on the dashboard (logged in)
    await page.goto('/');
    // Check if we are already logged in by looking for Dashboard text
    let isDashboard = false;
    try {
      await page.waitForSelector('text=Dashboard', { timeout: 5000 });
      isDashboard = true;
    } catch (e) {
      // Not on dashboard, need to log in
    }
    if (!isDashboard) {
      // Log in as E2E Test Representative
      await page.goto('/login');
      await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
      await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
      await page.fill('input[name="pin"]', '1234');
      await page.click('button:has-text("Sign in")');
      // Wait for login to complete (redirect to dashboard)
      await page.waitForURL('**/', { waitUntil: 'networkidle' });
    }
  });

  test('edit route exists and loads edit form', async ({ page }) => {
    // Navigate directly to edit page for a non-existent invoice (should show not found or redirect)
    await page.goto('/invoices/999999/edit');

    // Should either show 404 or redirect
    await page.waitForTimeout(500);

    // For now just verify we don't get a 500 error
    const title = await page.title();
    expect(title).not.toContain('Error');

    // Try to navigate to a real invoice after creating one
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached' });

    // Set our values (before wage line interaction to avoid potential form reset from template)
    await page.fill('#customer_name', 'Edit Test Customer');
    await page.fill('#customer_address', '123 Edit Street');

    // Add a wage line (select Mon-Thu) by clicking the labels FIRST
    // This prevents potential form reset issues that occur after wage line interaction
    const days = ['Mon', 'Tue', 'Wed', 'Thu'];
    for (const day of days) {
      const label = page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`);
      await label.click();
    }
    await page.click('#calc-add');

    // Save as draft
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().endsWith('/api/invoices') && resp.request().method() === 'POST'),
      page.click('#submit-draft')
    ]);
    console.log(`Response status: ${response.status()}`);
    console.log(`Response URL: ${response.url()}`);

    // Should redirect to invoice view
    await page.waitForURL(/\/invoices\/\d+/);
    const viewUrl = page.url();
    const invoiceIdMatch = viewUrl.match(/\/invoices\/(\d+)/);
    expect(invoiceIdMatch).toBeTruthy();
    const invoiceId = invoiceIdMatch[1];
    console.log(`Invoice ID: ${invoiceId}`);

    // Now try to edit it
    await page.goto(`/invoices/${invoiceId}/edit`);
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });

    // Verify we are on the edit page by checking the URL
    await expect(page).toHaveURL(/\/invoices\/\d+\/edit/);

    // Verify the form is populated with the data we entered
    const customerName = await page.locator('#customer_name').inputValue();
    expect(customerName).toBe('Edit Test Customer');

    const customerAddress = await page.locator('#customer_address').inputValue();
    expect(customerAddress).toBe('123 Edit Street');

    // Verify that we have exactly one wage line (the one we added)
    const wageLine = page.locator('.line-row[data-line-item-type="wages"]');
    await expect(wageLine).toBeVisible();

    // Optionally, check the description of the wage line (should start with "Wages/Retainer")
    const wageDescription = await wageLine.locator('input[name="item_description"]').inputValue();
    expect(wageDescription).toContain('Wages/Retainer');
  });
});