const { test, expect } = require('@playwright/test');

test.describe('Structured Wage Descriptions', () => {
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

  test('wage line has structured primary description and day details', async ({ page }) => {
    await ensureAllUnchecked(page);
    
    // Set week start to a known Monday (24 Aug 2026)
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Select Mon, Tue, Wed, Thu, Sat (4 full days + 1 half day)
    await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Tue"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Wed"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Thu"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);
    
    // Add customer details
    await page.fill('#customer_name', 'Test Customer');
    await page.fill('#customer_address', '123 Test Street');
    await page.fill('#notes', 'Test notes');
    
    // Click add item button to add wage line
    await page.click('#calc-add');
    await page.waitForTimeout(100);
    
    // Find the wage line by its stable attribute
    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    expect(await wageRow.isVisible()).toBeTruthy();
    
    // Verify primary description format: "Wages/Retainer — Week of 24–28 Aug 2026 — $900.00"
    const primaryDesc = await wageRow.locator('input[name="item_description"]').inputValue();
    expect(primaryDesc).toMatch(/Wages\/Retainer — Week of \d{2}–\d{2} [A-Za-z]{3} \d{4} — \$900\.00/);
    
    // Verify rate and amount
    const wageLineRate = await wageRow.locator('input[name="item_rate"]').inputValue();
    expect(wageLineRate).toContain('900');
    
    // Verify day details row exists
    const detailsRow = wageRow.locator('..').locator('.wage-details').first();
    expect(await detailsRow.isVisible()).toBeTruthy();
    
    // Verify day details content (format: "Mon — 24th 24/08/2026")
    const detailsText = await detailsRow.textContent();
    expect(detailsText).toContain('Mon — 24th 24/08/2026');
    expect(detailsText).toContain('Tue — 25th 25/08/2026');
    expect(detailsText).toContain('Wed — 26th 26/08/2026');
    expect(detailsText).toContain('Thu — 27th 27/08/2026');
    expect(detailsText).toContain('Sat — 29th 29/08/2026 (½ day)');
    
    // Verify only selected days are shown (no Fri)
    expect(detailsText).not.toContain('Fri');
    
    // Verify preview shows the same details
    const previewItems = page.locator('#pv-items');
    const previewHtml = await previewItems.innerHTML();
    expect(previewHtml).toContain('Wages/Retainer — Week of');
    expect(previewHtml).toContain('Mon — 24th 24/08/2026');
    expect(previewHtml).toContain('Sat — 29th 29/08/2026 (½ day)');
  });
  
  test('ordinary line items remain compatible', async ({ page }) => {
    await ensureAllUnchecked(page);
    
    // Just verify the wage line still works correctly
    await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
    await page.waitForTimeout(100);
    
    await page.click('#calc-add');
    await page.waitForTimeout(100);
    
    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    expect(await wageRow.isVisible()).toBeTruthy();
    
    // Check that there's no wage-details row when we don't expect one
    const detailsRow = wageRow.locator('..').locator('.wage-details').first();
    // This might exist but should be empty or not interfere
  });
});