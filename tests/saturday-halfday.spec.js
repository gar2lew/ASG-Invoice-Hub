const { test, expect } = require('@playwright/test');

test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Saturday Half-Day', () => {
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

    // Go to the invoice page
    await page.goto('/invoices/new');
    // Wait for the invoice form to be visible
    await expect(page.locator('#invoice-form')).toBeVisible();
  });

  // Helper to ensure all checkboxes are unchecked
  async function ensureAllUnchecked(page) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      const wageControl = page.locator(`#calc-days .calc-day:has(input[data-day=\"${day}\"])`);
      const wageInput = wageControl.locator('input');

      if (await wageInput.isChecked()) {
        await wageControl.click();
      }

      await expect(wageInput).not.toBeChecked();

      await expect(
        page.locator(`#wage-days input[name=\"wage_day\"][data-day=\"${day}\"]`)
      ).not.toBeChecked();
    }
  }

  test('Saturday selects in both directions', async ({ page }) => {
    // Explicitly set a known Monday so the test is date-independent
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // 1. Select Mon-Thu in Wage Calculator
    await page.locator('#calc-days .calc-day:has(input[data-day=\"Mon\"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day=\"Tue\"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day=\"Wed\"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day=\"Thu\"])').click();
    await page.waitForTimeout(100);

    // Verify Mon-Thu selected in both widgets
    expect(await page.locator('#calc-days input[data-day=\"Mon\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days input[data-day=\"Tue\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days input[data-day=\"Wed\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days input[data-day=\"Thu\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Mon\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Tue\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Wed\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Thu\"]').isChecked()).toBeTruthy();

    // Verify total is $800.00 (4 * 200)
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal).toContain('800.00');

    // 2. Select Sat in Wage Calculator
    await page.locator('#calc-days .calc-day:has(input[data-day=\"Sat\"])').click();
    await page.waitForTimeout(100);

    // 3. Confirm Sat selects in Dates & Notes
    expect(await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Sat\"]').isChecked()).toBeTruthy();

    // 4. Confirm Sat date is week start +5 (29/08/2026 for week starting 24/08/2026)
    const satDateInput = await page.locator('input[name=\"date_Sat\"]').inputValue();
    expect(satDateInput).toBe('2026-08-29');

    // 5. Confirm breakdown includes "Sat ½: $100.00"
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    expect(calcBreakdown).toContain('Sat ½');
    expect(calcBreakdown).toContain('100.00');

    // 6. Confirm total is $900.00 (800.00 + 100.00)
    const calcTotal2 = await page.locator('#calc-total').textContent();
    expect(calcTotal2).toContain('900.00');

    // 7. Untoggle Sat from Dates & Notes
    await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Sat\"]').click();
    await page.waitForTimeout(100);

    // 8. Confirm it clears in Wage Calculator
    expect(await page.locator('#calc-days input[data-day=\"Sat\"]').isChecked()).toBeFalsy();
    expect(await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Sat\"]').isChecked()).toBeFalsy();

    // 9. Confirm total returns to $800.00
    const calcTotal3 = await page.locator('#calc-total').textContent();
    expect(calcTotal3).toContain('800.00');

    // 10. Repeat selection in opposite direction (Dates & Notes first)
    await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Sat\"]').click();
    await page.waitForTimeout(100);

    // Confirm Sat selects in Wage Calculator
    expect(await page.locator('#calc-days input[data-day=\"Sat\"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name=\"wage_day\"][data-day=\"Sat\"]').isChecked()).toBeTruthy();

    // Confirm total is $900.00 again
    const calcTotal4 = await page.locator('#calc-total').textContent();
    expect(calcTotal4).toContain('900.00');
  });
});