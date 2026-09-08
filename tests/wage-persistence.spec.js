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

  async function ensureAllUnchecked(page) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      const wageControl = page.locator(`#calc-days-standard .calc-day:has(input[data-day="${day}"]), #calc-days-sat .calc-day:has(input[data-day="${day}"])`);
      const wageInput = wageControl.locator('input');
      if (await wageInput.isChecked()) {
        await wageControl.click();
      }
      await expect(wageInput).not.toBeChecked();
      await expect(
        page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]`)
      ).not.toBeChecked();
    }
  }

  test('wage details persist when saving and reopening invoice', async ({ page }) => {
    await ensureAllUnchecked(page);
    
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Select Mon, Wed, Sat
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Mon"])').click();
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Wed"])').click();
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);
    
    await page.fill('#customer_name', 'Persistence Test Customer');
    await page.fill('#customer_address', '123 Persistence Street');
    await page.fill('#notes', 'Test notes for persistence');
    
    await page.click('#calc-add');
    await page.waitForTimeout(500);
    
    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 5000 });
    
    const primaryDesc = await wageRow.locator('input[name="item_description"]').inputValue();
    expect(primaryDesc).toMatch(/Wages\/Retainer — Week of \d{2}–\d{2} [A-Za-z]{3} \d{4} — \$/);
    
    const detailsRow = page.locator('.wage-details').first();
    await expect(detailsRow).toBeVisible({ timeout: 5000 });
    
    const detailsText = await detailsRow.textContent();
    expect(detailsText).toContain('Mon — 24th 24/08/2026');
    expect(detailsText).toContain('Wed — 26th 26/08/2026');
    expect(detailsText).toContain('Sat — 29th 29/08/2026 (½ day)');
    
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
    expect(restoredPrimaryDesc).toMatch(/Wages\/Retainer — Week of \d{2}–\d{2} [A-Za-z]{3} \d{4} — \$/);
    
    const restoredDetailsRow = page.locator('.wage-details').first();
    await expect(restoredDetailsRow).toBeVisible({ timeout: 5000 });
    
    const restoredDetailsText = await restoredDetailsRow.textContent();
    expect(restoredDetailsText).toContain('Mon — 24th 24/08/2026');
    expect(restoredDetailsText).toContain('Wed — 26th 26/08/2026');
    expect(restoredDetailsText).toContain('Sat — 29th 29/08/2026 (½ day)');
    
    expect(restoredDetailsText).not.toContain('Tue');
    expect(restoredDetailsText).not.toContain('Thu');
    expect(restoredDetailsText).not.toContain('Fri');
  });
  
  test('ordinary line items without details still work', async ({ page }) => {
    await ensureAllUnchecked(page);
    
    await page.fill('#customer_name', 'Ordinary Line Test');
    await page.fill('#customer_address', '456 Ordinary Ave');
    await page.fill('#notes', 'Test ordinary line');
    
    expect(page._jsErrors.length).toBe(0);
  });
});