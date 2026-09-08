const { test, expect } = require('@playwright/test');

test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Saturday Half-Day', () => {
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
    await expect(page.locator('#invoice-form')).toBeVisible();
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

  test('Saturday selects in both directions', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // 1. Select Mon-Thu in Wage Calculator
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Mon"])').click();
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Tue"])').click();
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Wed"])').click();
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Thu"])').click();
    await page.waitForTimeout(100);

    // Verify Mon-Thu selected in both widgets
    expect(await page.locator('#calc-days-standard input[data-day="Mon"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days-standard input[data-day="Tue"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days-standard input[data-day="Wed"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days-standard input[data-day="Thu"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name="wage_day"][data-day="Mon"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name="wage_day"][data-day="Tue"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name="wage_day"][data-day="Wed"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name="wage_day"][data-day="Thu"]').isChecked()).toBeTruthy();

    // Verify total is $800.00 (4 * 200)
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal).toContain('800.00');

    // 2. Select Sat in Wage Calculator
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);

    // 3. Confirm Sat selects in Dates & Notes
    expect(await page.locator('#wage-days input[name="wage_day"][data-day="Sat"]').isChecked()).toBeTruthy();

    // 4. Confirm Sat date is week start +5 (29/08/2026 for week starting 24/08/2026)
    const satDateInput = await page.locator('input[name="date_Sat"]').inputValue();
    expect(satDateInput).toBe('2026-08-29');

    // 5. Confirm breakdown includes "Sat ½: $100.00"
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    expect(calcBreakdown).toContain('Sat ½');
    expect(calcBreakdown).toContain('100.00');

    // 6. Confirm total is $900.00 (800.00 + 100.00)
    const calcTotal2 = await page.locator('#calc-total').textContent();
    expect(calcTotal2).toContain('900.00');

    // 7. Untoggle Sat from Dates & Notes
    await page.locator('#wage-days input[name="wage_day"][data-day="Sat"]').click();
    await page.waitForTimeout(100);

    // 8. Confirm it clears in Wage Calculator
    expect(await page.locator('#calc-days-sat input[data-day="Sat"]').isChecked()).toBeFalsy();
    expect(await page.locator('#wage-days input[name="wage_day"][data-day="Sat"]').isChecked()).toBeFalsy();

    // 9. Confirm total returns to $800.00
    const calcTotal3 = await page.locator('#calc-total').textContent();
    expect(calcTotal3).toContain('800.00');

    // 10. Repeat selection in opposite direction (Dates & Notes first)
    await page.locator('#wage-days input[name="wage_day"][data-day="Sat"]').click();
    await page.waitForTimeout(100);

    // Confirm Sat selects in Wage Calculator
    expect(await page.locator('#calc-days-sat input[data-day="Sat"]').isChecked()).toBeTruthy();
    expect(await page.locator('#wage-days input[name="wage_day"][data-day="Sat"]').isChecked()).toBeTruthy();

    // Confirm total is $900.00 again
    const calcTotal4 = await page.locator('#calc-total').textContent();
    expect(calcTotal4).toContain('900.00');
  });

  test('Select Mon-Fri deselects Saturday', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // First manually select Saturday
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);
    expect(await page.locator('#calc-days-sat input[data-day="Sat"]').isChecked()).toBeTruthy();

    // Now click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Verify Mon-Fri selected
    expect(await page.locator('#calc-days-standard input[data-day="Mon"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days-standard input[data-day="Tue"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days-standard input[data-day="Wed"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days-standard input[data-day="Thu"]').isChecked()).toBeTruthy();
    expect(await page.locator('#calc-days-standard input[data-day="Fri"]').isChecked()).toBeTruthy();

    // Verify Saturday is deselected
    expect(await page.locator('#calc-days-sat input[data-day="Sat"]').isChecked()).toBeFalsy();

    // Verify total is $1000.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('1000.00');
  });

  test('Mon-Fri week totals $1000', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Verify total is $1000.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('1000.00');

    // Verify breakdown shows 5 days
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    expect(calcBreakdown).toContain('Mon');
    expect(calcBreakdown).toContain('Tue');
    expect(calcBreakdown).toContain('Wed');
    expect(calcBreakdown).toContain('Thu');
    expect(calcBreakdown).toContain('Fri');
    expect(calcBreakdown).not.toContain('Sat');
  });

  test('Saturday only totals $100', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // Select only Saturday
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);

    // Verify total is $100.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal).toContain('100.00');
  });

  test('Mon-Fri + Saturday totals $1100', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Manually add Saturday
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);

    // Verify total is $1100.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('1100.00');
  });

  test('Deselect Saturday returns to $1000', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Add Saturday
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);

    // Verify $1100
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('1100.00');

    // Deselect Saturday
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);

    // Verify back to $1000
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('1000.00');
  });

  test('Individual day combinations are correct', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // Mon only = $200
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Mon"])').click();
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('200.00');

    // Add Wed + Fri = $600
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Wed"])').click();
    await page.waitForTimeout(50);
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Fri"])').click();
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('600.00');
  });

  test('Dates display in DD/MM/YYYY format', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Check that date tiles show DD/MM/YYYY format
    const monDate = await page.locator('#wage-days .wage-day-tile[data-day="Mon"] .wage-date-display').textContent();
    expect(monDate).toContain('24/08/2026');

    const satDate = await page.locator('#wage-days .wage-day-tile[data-day="Sat"] .wage-date-display').textContent();
    expect(satDate).toContain('29/08/2026');
  });

  test('Saturday detail appears only when selected', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    await ensureAllUnchecked(page);

    // Select Mon-Fri
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Verify no Saturday in breakdown
    const breakdown = await page.locator('#calc-breakdown').textContent();
    expect(breakdown).not.toContain('Sat');

    // Add Saturday
    await page.locator('#calc-days-sat .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);

    // Verify Saturday appears in breakdown
    const breakdown2 = await page.locator('#calc-breakdown').textContent();
    expect(breakdown2).toContain('Sat');
    expect(breakdown2).toContain('½');
  });
});