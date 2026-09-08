// tests/shared-week.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Shared Week State', () => {
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

  test('Week date populates both widgets', async ({ page }) => {
    // Check for JavaScript errors first
    const errors = page._jsErrors;
    if (errors.length > 0) {
      throw new Error(`JavaScript errors detected: ${errors.join('; ')}`);
    }
    
    // Use 2026-08-24 which is a Monday
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Verify we're on the correct page
    await expect(page).toHaveURL(/\/invoices\/new/);
    
    // Debug: check what's in the week header
    const weekHeader = await page.textContent('#calc-week-range');
    console.log(`Week header content: '${weekHeader}'`);
    
    // Debug: check week_start value
    const weekStartValue = await page.inputValue('#week_start');
    console.log(`Week start value: '${weekStartValue}'`);
    
    // Expected: Week of 24–29 Aug 2026 (Monday to Saturday - Saturday is a half-day)
        // 2026-08-24 IS a Monday
        expect(weekHeader).toBe('Week of 24–29 Aug 2026');
    
    const checkDate = async (name, expected) => {
      const val = await page.inputValue(name);
      console.log(`${name}: '${val}' (expected: '${expected}')`);
      expect(val).toBe(expected);
    };
    
    await checkDate('[name="date_Mon"]', '2026-08-24');
    await checkDate('[name="date_Tue"]', '2026-08-25');
    await checkDate('[name="date_Wed"]', '2026-08-26');
    await checkDate('[name="date_Thu"]', '2026-08-27');
    await checkDate('[name="date_Fri"]', '2026-08-28');
    
    // Verify no page errors
    const pageErrors = page._jsErrors;
    expect(pageErrors).toEqual([]);
  });

  test('Toggle in Wage Calculator updates Dates & Notes', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // First, uncheck all days to have a clean state (Wage Calculator)
    // Wage Calculator checkboxes now have data-day attribute
    const calcCheckboxes = await page.locator('#calc-days input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Select Monday in Wage Calculator (first checkbox)
    await page.locator('#calc-days input[data-day="Mon"]').check();
    await page.waitForTimeout(100);
    
    const monChecked = await page.isChecked('[data-day="Mon"]');
    expect(monChecked).toBe(true);
    
    const tueChecked = await page.isChecked('[data-day="Tue"]');
    expect(tueChecked).toBe(false);
    
    const totalText = await page.textContent('#calc-total');
        expect(totalText).toBe('$200.00');
    
        const breakdown = await page.textContent('#calc-breakdown');
        expect(breakdown).toContain('Mon: $200.00');
        expect(breakdown).toContain('→ $200.00');
    
    // Verify no page errors
    expect(page._jsErrors).toEqual([]);
  });

  test('Toggle in Dates & Notes updates Wage Calculator', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Uncheck all days in Wage Calculator to start clean
    const calcCheckboxes = await page.locator('#calc-days input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Select Wednesday in Dates & Notes
    await page.check('[data-day="Wed"]');
    await page.waitForTimeout(100);
    
    const wedChecked = await page.locator('#calc-days input[data-day="Wed"]');
    expect(await wedChecked.isChecked()).toBe(true);
    
    const totalText = await page.textContent('#calc-total');
        expect(totalText).toBe('$200.00');
    
        const breakdown = await page.textContent('#calc-breakdown');
        expect(breakdown).toContain('Wed: $200.00');
        expect(breakdown).toContain('→ $200.00');
    
    // Verify no page errors
    expect(page._jsErrors).toEqual([]);
  });

  test('Untoggling synchronises both widgets', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Start with no days selected - uncheck all first
    const calcCheckboxes = await page.locator('#calc-days input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Start with Mon, Wed, Fri selected in Wage Calculator (using data-day)
    await page.locator('#calc-days input[data-day="Mon"]').check(); // Mon
    await page.locator('#calc-days input[data-day="Wed"]').check(); // Wed
    await page.locator('#calc-days input[data-day="Fri"]').check(); // Fri
    await page.waitForTimeout(100);
    
    // Untoggle Wednesday from Dates & Notes
    await page.uncheck('[data-day="Wed"]');
    await page.waitForTimeout(100);
    
    const wedCheckedCalc = await page.locator('#calc-days input[data-day="Wed"]');
    expect(await wedCheckedCalc.isChecked()).toBe(false);
    
    const monCheckedCalc = await page.locator('#calc-days input[data-day="Mon"]');
    expect(await monCheckedCalc.isChecked()).toBe(true);
    
    const friCheckedCalc = await page.locator('#calc-days input[data-day="Fri"]');
    expect(await friCheckedCalc.isChecked()).toBe(true);
    
    const totalText = await page.textContent('#calc-total');
    expect(totalText).toBe('$400.00'); // 2 days * 200
    
    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon: $200.00');
    expect(breakdown).toContain('Fri: $200.00');
    expect(breakdown).not.toContain('Wed:');
    expect(breakdown).toContain('→ $400.00');
    
    // Verify no page errors
    expect(page._jsErrors).toEqual([]);
  });

  test('Complete three-day wage calculation', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Start with no days selected
    const calcCheckboxes = await page.locator('#calc-days input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Select Mon, Wed, Fri using Wage Calculator (using data-day)
    await page.locator('#calc-days input[data-day="Mon"]').check(); // Mon
    await page.locator('#calc-days input[data-day="Wed"]').check(); // Wed
    await page.locator('#calc-days input[data-day="Fri"]').check(); // Fri
    await page.waitForTimeout(100);
    
    const totalText = await page.textContent('#calc-total');
    expect(totalText).toBe('$600.00');
    
    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon: $200.00');
    expect(breakdown).toContain('Wed: $200.00');
    expect(breakdown).toContain('Fri: $200.00');
    expect(breakdown).toContain('→ $600.00');
    
    // Untoggle Wed using Dates & Notes
    await page.uncheck('[data-day="Wed"]');
    await page.waitForTimeout(100);
    
    const totalAfterUntoggle = await page.textContent('#calc-total');
    expect(totalAfterUntoggle).toBe('$400.00');
    
    const breakdownAfter = await page.textContent('#calc-breakdown');
    expect(breakdownAfter).toContain('Mon: $200.00');
    expect(breakdownAfter).toContain('Fri: $200.00');
    expect(breakdownAfter).not.toContain('Wed:');
    expect(breakdownAfter).toContain('→ $400.00');
    
    // Verify no page errors
    expect(page._jsErrors).toEqual([]);
  });

  test('Add the shared week to the invoice', async ({ page }) => {
      await page.fill('#week_start', '2026-08-24');
      await page.waitForTimeout(100);

      // Ensure all days unchecked first (same pattern as wage-description.spec.js)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (const day of days) {
        const wageControl = page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`);
        const wageInput = wageControl.locator('input');
        if (await wageInput.isChecked()) {
          await wageControl.click();
        }
      }
      await page.waitForTimeout(100);

      // Select Mon, Wed, Fri by clicking labels
      await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
      await page.locator('#calc-days .calc-day:has(input[data-day="Wed"])').click();
      await page.locator('#calc-days .calc-day:has(input[data-day="Fri"])').click();
      await page.waitForTimeout(500);

      // Debug: check button state
      const isDisabled = await page.locator('#calc-add').getAttribute('disabled');
      const totalText = await page.textContent('#calc-total');
      const breakdownText = await page.textContent('#calc-breakdown');
      // console.log(`Button disabled: ${isDisabled}, Total: ${totalText}, Breakdown: ${breakdownText}`);

      // Wait for the Add to invoice button to be enabled
      await page.waitForSelector('#calc-add:not([disabled])', { timeout: 10000 });
      await page.click('#calc-add');
      await page.waitForTimeout(100);

      // Verify the line item was added - get fresh count
      const lineCount = await page.$$eval('.line-row:not(.line-head):not(.wage-details)', rows => rows.length);
      expect(lineCount).toBeGreaterThanOrEqual(1);

      // Check the last added wage line (same pattern as wage-description.spec.js)
      const wageRow = page.locator('[data-line-item-type="wages"]').first();
      await expect(wageRow).toBeVisible({ timeout: 10000 });
      const description = await wageRow.locator('input[name="item_description"]').inputValue();
    
    const quantity = await wageRow.locator('input[name="item_qty"]').inputValue();
        expect(quantity).toBe('1');

        const rate = await wageRow.locator('input[name="item_rate"]').inputValue();
        expect(rate).toBe('600');

        const amount = await wageRow.locator('.line-amount').textContent();
        expect(amount).toBe('$600.00');
    
    // Verify no page errors
    expect(page._jsErrors).toEqual([]);
  });

  test('Changing week start does not clear selected days', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Select Monday and Wednesday in Dates & Notes (using data-day)
    await page.check('[data-day="Mon"]');
    await page.check('[data-day="Wed"]');
    await page.waitForTimeout(100);
    
    // Change week start to the following Monday (2026-08-31)
    await page.fill('#week_start', '2026-08-31');
    await page.waitForTimeout(100);
    
    // Verify Monday and Wednesday are still selected in Dates & Notes
    const monChecked = await page.isChecked('[data-day="Mon"]');
    const wedChecked = await page.isChecked('[data-day="Wed"]');
    expect(monChecked).toBe(true);
    expect(wedChecked).toBe(true);
    
    // Verify the same in Wage Calculator
    const monCheckedCalc = await page.locator('#calc-days input[data-day="Mon"]');
    const wedCheckedCalc = await page.locator('#calc-days input[data-day="Wed"]');
    expect(await monCheckedCalc.isChecked()).toBe(true);
    expect(await wedCheckedCalc.isChecked()).toBe(true);
    
    // Verify the dates updated correctly
    const monDate = await page.inputValue('[name="date_Mon"]');
    const tueDate = await page.inputValue('[name="date_Tue"]');
    const wedDate = await page.inputValue('[name="date_Wed"]');
    const thuDate = await page.inputValue('[name="date_Thu"]');
    const friDate = await page.inputValue('[name="date_Fri"]');
    expect(monDate).toBe('2026-08-31');
    expect(tueDate).toBe('2026-09-01');
    expect(wedDate).toBe('2026-09-02');
    expect(thuDate).toBe('2026-09-03');
    expect(friDate).toBe('2026-09-04');
    
    // Verify no page errors
    expect(page._jsErrors).toEqual([]);
  });
});