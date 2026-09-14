const { test, expect } = require('@playwright/test');

test.describe('Wage Detail Persistence', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      errors.push(`PAGE ERROR: ${err.message}`);
    });
    page._jsErrors = errors;
    page._consoleMessages = consoleMessages;
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', {
      state: 'attached',
      timeout: 5000
    });
  });

  async function setDayState(page, day, state) {
    const btn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn[data-state="${state}"], #calc-days-sat .calc-day[data-day="${day}"] .day-btn[data-state="${state}"]`);
    await btn.click();
    await page.waitForTimeout(50);
  }

  test('wage details persist when saving and reopening invoice', async ({ page }) => {
    // Clear week first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Select Mon, Wed (full), Sat (half)
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    await page.fill('#customer_name', 'Persistence Test Customer');
    await page.fill('#customer_address', '123 Persistence Street');
    await page.fill('#notes', 'Test notes for persistence');

    await page.click('#calc-add');
    await page.waitForTimeout(500);

    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 5000 });

    const primaryDesc = await wageRow.locator('input[name="item_description"]').inputValue();
    expect(primaryDesc).toMatch(/Wages\/Retainer - Week of \d{2}-\d{2} [A-Za-z]{3} \d{4}/);
    expect(primaryDesc).not.toContain('$');

    const detailsRow = page.locator('.wage-details').first();
    await expect(detailsRow).toBeVisible({ timeout: 5000 });

    const detailsText = await detailsRow.textContent();
    expect(detailsText).toContain('Mon - 24th 24/08/2026');
    expect(detailsText).toContain('Wed - 26th 26/08/2026');
    expect(detailsText).toContain('Sat - 29th 29/08/2026');

    expect(detailsText).not.toContain('Tue');
    expect(detailsText).not.toContain('Thu');
    expect(detailsText).not.toContain('Fri');

    // Save the invoice
    await page.click('#submit-draft');
    await page.waitForTimeout(1000);

    await page.waitForURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();
    const invoiceIdMatch = invoiceUrl.match(/\/invoices\/(\d+)/);
    expect(invoiceIdMatch).toBeTruthy();
    const invoiceId = invoiceIdMatch[1];

    const invoiceItemsTable = page.locator('table.table tbody tr');
    const rowsCount = await invoiceItemsTable.count();
    expect(rowsCount).toBeGreaterThan(0);

    const wageRowView = page.locator('table.table tbody tr').filter({ hasText: 'Wages/Retainer' });
    await expect(wageRowView.first()).toBeVisible({ timeout: 5000 });

    // Navigate back to edit
    await page.goto(`/invoices/${invoiceId}/edit`);
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });

    await page.waitForFunction(
      () => document.querySelectorAll('[data-line-item-type="wages"]').length > 0,
      { timeout: 10000 }
    );

    const restoredWageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(restoredWageRow).toBeVisible({ timeout: 5000 });

    const restoredPrimaryDesc = await restoredWageRow.locator('input[name="item_description"]').inputValue();
    expect(restoredPrimaryDesc).toMatch(/Wages\/Retainer - Week of \d{2}-\d{2} [A-Za-z]{3} \d{4}/);
    expect(restoredPrimaryDesc).not.toContain('$');

    const restoredDetailsRow = page.locator('.wage-details').first();
    await expect(restoredDetailsRow).toBeVisible({ timeout: 5000 });

    const restoredDetailsText = await restoredDetailsRow.textContent();
    expect(restoredDetailsText).toContain('Mon - 24th 24/08/2026');
    expect(restoredDetailsText).toContain('Wed - 26th 26/08/2026');
    expect(restoredDetailsText).toContain('Sat - 29th 29/08/2026');

    expect(restoredDetailsText).not.toContain('Tue');
    expect(restoredDetailsText).not.toContain('Thu');
    expect(restoredDetailsText).not.toContain('Fri');
  });

  test('ordinary line items without details still work', async ({ page }) => {
    // Clear week first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    await page.fill('#customer_name', 'Ordinary Line Test');
    await page.fill('#customer_address', '456 Ordinary Ave');
    await page.fill('#notes', 'Test ordinary line');

    expect(page._jsErrors.length).toBe(0);
  });

  test('half-day state persists after save and reload', async ({ page }) => {
    // Clear week first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Select Mon Half, Tue Full, Sat Half
    await setDayState(page, 'Mon', 'half');
    await setDayState(page, 'Tue', 'full');
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    await page.fill('#customer_name', 'Half Day Persistence Test');
    await page.click('#calc-add');
    await page.waitForTimeout(500);

    // Verify total = $370 (90 + 180 + 100)
    expect(await page.locator('#calc-total').textContent()).toContain('370.00');

    // Save
    await page.click('#submit-draft');
    await page.waitForTimeout(1000);
    await page.waitForURL(/\/invoices\/\d+/);

    const invoiceUrl = page.url();
    const invoiceId = invoiceUrl.match(/\/invoices\/(\d+)/)[1];

    // Reload for editing
    await page.goto(`/invoices/${invoiceId}/edit`);
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
    await page.waitForFunction(
      () => document.querySelectorAll('[data-line-item-type="wages"]').length > 0,
      { timeout: 10000 }
    );

    // Verify the total is preserved
    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    const rate = await wageRow.locator('input[name="item_rate"]').inputValue();
    expect(rate).toBe('370');

    // Verify details show half/full labels
    const detailsRow = page.locator('.wage-details').first();
    const detailsText = await detailsRow.textContent();
    expect(detailsText).toContain('Half day');
    expect(detailsText).toContain('Full day');
  });
});
