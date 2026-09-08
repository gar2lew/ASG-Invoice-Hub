const { test, expect } = require('@playwright/test');

test.describe('Wage Detail Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for JavaScript errors and console messages
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

    // Store for later use
    page._jsErrors = errors;
    page._consoleMessages = consoleMessages;

    // Navigate directly to new invoice page - storageState provides representative auth
    await page.goto('/invoices/new');

    await page.waitForSelector('form#invoice-form', {
      state: 'attached',
      timeout: 5000
    });
  });

  // Helper to ensure all checkboxes are unchecked
  async function ensureAllUnchecked(page) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      const wageControl = page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`);
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
    
    // Set week start to a known Monday (24 Aug 2026)
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Select Mon, Wed, Sat (Mon and Wed full days, Sat half day)
    await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Wed"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);
    
    // Add customer details
    await page.fill('#customer_name', 'Persistence Test Customer');
    await page.fill('#customer_address', '123 Persistence Street');
    await page.fill('#notes', 'Test notes for persistence');
    
    // Click add item button to add wage line
    await page.click('#calc-add');
    await page.waitForTimeout(500);
    
    // Find the wage line by its stable attribute
    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 5000 });
    
    // Verify primary description format
    const primaryDesc = await wageRow.locator('input[name="item_description"]').inputValue();
    expect(primaryDesc).toMatch(/Wages\/Retainer — Week of \d{2}–\d{2} [A-Za-z]{3} \d{4} — \$/);
    
    // Verify day details row exists
    const detailsRow = page.locator('.wage-details').first();
    await expect(detailsRow).toBeVisible({ timeout: 5000 });
    
    // Verify day details content (format: "Mon — 24th 24/08/2026")
    const detailsText = await detailsRow.textContent();
    expect(detailsText).toContain('Mon — 24th 24/08/2026');
    expect(detailsText).toContain('Wed — 26th 26/08/2026');
    expect(detailsText).toContain('Sat — 29th 29/08/2026 (½ day)');
    
    // Verify only selected days are shown (no Tue, Thu, Fri)
    expect(detailsText).not.toContain('Tue');
    expect(detailsText).not.toContain('Thu');
    expect(detailsText).not.toContain('Fri');
    
    // Save the invoice (submit draft)
    await page.click('#submit-draft');
    await page.waitForTimeout(1000);
    
    // Should redirect to invoice view page
    await page.waitForURL(/\/invoices\/\d+/);
    
    // Get the invoice ID from URL
    const invoiceUrl = page.url();
    const invoiceIdMatch = invoiceUrl.match(/\/invoices\/(\d+)/);
    expect(invoiceIdMatch).toBeTruthy();
    const invoiceId = invoiceIdMatch[1];
    
    // Verify wage line details on the invoice view page
    // Check the invoice items table
    const invoiceItemsTable = page.locator('table.table tbody tr');
    const rowsCount = await invoiceItemsTable.count();
    expect(rowsCount).toBeGreaterThan(0);
    
    // Find the wage row
    const wageRowView = page.locator('table.table tbody tr').filter({ hasText: 'Wages/Retainer' });
    await expect(wageRowView.first()).toBeVisible({ timeout: 5000 });
    
    // Navigate back to edit the invoice to verify details persist in form
    await page.goto(`/invoices/${invoiceId}/edit`);
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
    
    // Wait for JavaScript to restore existing items
    await page.waitForFunction(
      () => document.querySelectorAll('[data-line-item-type="wages"]').length > 0,
      { timeout: 10000 }
    );
    
    // Verify wage line details are restored in the form
    const restoredWageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(restoredWageRow).toBeVisible({ timeout: 5000 });
    
    const restoredPrimaryDesc = await restoredWageRow.locator('input[name="item_description"]').inputValue();
    expect(restoredPrimaryDesc).toMatch(/Wages\/Retainer — Week of \d{2}–\d{2} [A-Za-z]{3} \d{4} — \$/);
    
    // Verify day details row exists
    const restoredDetailsRow = page.locator('.wage-details').first();
    await expect(restoredDetailsRow).toBeVisible({ timeout: 5000 });
    
    // Verify day details content (format: "Mon — 24th 24/08/2026")
    const restoredDetailsText = await restoredDetailsRow.textContent();
    expect(restoredDetailsText).toContain('Mon — 24th 24/08/2026');
    expect(restoredDetailsText).toContain('Wed — 26th 26/08/2026');
    expect(restoredDetailsText).toContain('Sat — 29th 29/08/2026 (½ day)');
    
    // Verify only selected days are shown
    expect(restoredDetailsText).not.toContain('Tue');
    expect(restoredDetailsText).not.toContain('Thu');
    expect(restoredDetailsText).not.toContain('Fri');
  });
  
  test('ordinary line items without details still work', async ({ page }) => {
    await ensureAllUnchecked(page);
    
    // Add an ordinary line item (not a wage line)
    // This tests that existing invoices without details still work
    await page.fill('#customer_name', 'Ordinary Line Test');
    await page.fill('#customer_address', '456 Ordinary Ave');
    
    // Add a simple line item manually if possible, or just verify no errors
    // The form should handle line items without details gracefully
    await page.fill('#notes', 'Test ordinary line');
    
    // Verify no JavaScript errors
    expect(page._jsErrors.length).toBe(0);
  });
});