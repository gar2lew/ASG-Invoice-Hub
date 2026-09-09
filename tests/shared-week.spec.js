const { test, expect } = require('@playwright/test');

test.describe('Shared Week State', () => {
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

  test('Week date populates both widgets', async ({ page }) => {
    const errors = page._jsErrors;
    if (errors.length > 0) {
      throw new Error(`JavaScript errors detected: ${errors.join('; ')}`);
    }
    
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    await expect(page).toHaveURL(/\/invoices\/new/);
    
    const weekHeader = await page.textContent('#calc-week-range');
    console.log(`Week header content: '${weekHeader}'`);
    
    const weekStartValue = await page.inputValue('#week_start');
    console.log(`Week start value: '${weekStartValue}'`);
    
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
    
    const pageErrors = page._jsErrors;
    expect(pageErrors).toEqual([]);
  });

  test('Toggle in Wage Calculator updates Dates & Notes', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Uncheck all days in Wage Calculator
    const calcCheckboxes = await page.locator('#calc-days-standard input[data-day], #calc-days-sat input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Select Monday in Wage Calculator
    await page.locator('#calc-days-standard input[data-day="Mon"]').check();
    await page.waitForTimeout(100);
    
    const monChecked = await page.isChecked('#calc-days-standard input[data-day="Mon"]');
    expect(monChecked).toBe(true);
    
    const tueChecked = await page.isChecked('#calc-days-standard input[data-day="Tue"]');
    expect(tueChecked).toBe(false);
    
    const totalText = await page.textContent('#calc-total');
        expect(totalText).toBe('$180.00');
    
        const breakdown = await page.textContent('#calc-breakdown');
        expect(breakdown).toContain('Mon: $180.00');
        expect(breakdown).toContain('→ $180.00');
    
    expect(page._jsErrors).toEqual([]);
  });

  test('Toggle in Dates & Notes updates Wage Calculator', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Uncheck all days in Wage Calculator
    const calcCheckboxes = await page.locator('#calc-days-standard input[data-day], #calc-days-sat input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Select Wednesday in Dates & Notes
    await page.check('#wage-days input[name="wage_day"][data-day="Wed"]');
    await page.waitForTimeout(100);
    
    const wedChecked = await page.locator('#calc-days-standard input[data-day="Wed"]');
    expect(await wedChecked.isChecked()).toBe(true);
    
    const totalText = await page.textContent('#calc-total');
        expect(totalText).toBe('$180.00');
    
        const breakdown = await page.textContent('#calc-breakdown');
        expect(breakdown).toContain('Wed: $180.00');
        expect(breakdown).toContain('→ $180.00');
    
    expect(page._jsErrors).toEqual([]);
  });

  test('Untoggling synchronises both widgets', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Start with no days selected
    const calcCheckboxes = await page.locator('#calc-days-standard input[data-day], #calc-days-sat input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Start with Mon, Wed, Fri selected in Wage Calculator
    await page.locator('#calc-days-standard input[data-day="Mon"]').check();
    await page.locator('#calc-days-standard input[data-day="Wed"]').check();
    await page.locator('#calc-days-standard input[data-day="Fri"]').check();
    await page.waitForTimeout(100);
    
    // Untoggle Wednesday from Dates & Notes
    await page.uncheck('#wage-days input[name="wage_day"][data-day="Wed"]');
    await page.waitForTimeout(100);
    
    const wedCheckedCalc = await page.locator('#calc-days-standard input[data-day="Wed"]');
    expect(await wedCheckedCalc.isChecked()).toBe(false);
    
    const monCheckedCalc = await page.locator('#calc-days-standard input[data-day="Mon"]');
    expect(await monCheckedCalc.isChecked()).toBe(true);
    
    const friCheckedCalc = await page.locator('#calc-days-standard input[data-day="Fri"]');
    expect(await friCheckedCalc.isChecked()).toBe(true);
    
    const totalText = await page.textContent('#calc-total');
        expect(totalText).toBe('$360.00');
    
        const breakdown = await page.textContent('#calc-breakdown');
        expect(breakdown).toContain('Mon: $180.00');
        expect(breakdown).toContain('Fri: $180.00');
        expect(breakdown).not.toContain('Wed:');
        expect(breakdown).toContain('→ $360.00');
    
    expect(page._jsErrors).toEqual([]);
  });

  test('Complete three-day wage calculation', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Start with no days selected
    const calcCheckboxes = await page.locator('#calc-days-standard input[data-day], #calc-days-sat input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(100);
    
    // Select Mon, Wed, Fri using Wage Calculator
    await page.locator('#calc-days-standard input[data-day="Mon"]').check();
    await page.locator('#calc-days-standard input[data-day="Wed"]').check();
    await page.locator('#calc-days-standard input[data-day="Fri"]').check();
    await page.waitForTimeout(100);
    
    const totalText = await page.textContent('#calc-total');
        expect(totalText).toBe('$540.00');
    
        const breakdown = await page.textContent('#calc-breakdown');
        expect(breakdown).toContain('Mon: $180.00');
        expect(breakdown).toContain('Wed: $180.00');
        expect(breakdown).toContain('Fri: $180.00');
        expect(breakdown).toContain('→ $540.00');
    
        // Untoggle Wed using Dates & Notes
        await page.uncheck('#wage-days input[name="wage_day"][data-day="Wed"]');
        await page.waitForTimeout(100);
    
        const totalAfterUntoggle = await page.textContent('#calc-total');
        expect(totalAfterUntoggle).toBe('$360.00');
    
        const breakdownAfter = await page.textContent('#calc-breakdown');
        expect(breakdownAfter).toContain('Mon: $180.00');
        expect(breakdownAfter).toContain('Fri: $180.00');
        expect(breakdownAfter).not.toContain('Wed:');
        expect(breakdownAfter).toContain('→ $360.00');
    
    expect(page._jsErrors).toEqual([]);
  });

  test('Add the shared week to the invoice', async ({ page }) => {
      await page.fill('#week_start', '2026-08-24');
      await page.waitForTimeout(100);

      // Ensure all days unchecked first
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (const day of days) {
        const wageControl = page.locator(`#calc-days-standard .calc-day:has(input[data-day="${day}"]), #calc-days-sat .calc-day:has(input[data-day="${day}"])`);
        const wageInput = wageControl.locator('input');
        if (await wageInput.isChecked()) {
          await wageControl.click();
        }
      }
      await page.waitForTimeout(100);

      // Select Mon, Wed, Fri by clicking labels
      await page.locator('#calc-days-standard .calc-day:has(input[data-day="Mon"])').click();
      await page.locator('#calc-days-standard .calc-day:has(input[data-day="Wed"])').click();
      await page.locator('#calc-days-standard .calc-day:has(input[data-day="Fri"])').click();
      await page.waitForTimeout(500);

      // Wait for the Add to invoice button to be enabled
      await page.waitForSelector('#calc-add:not([disabled])', { timeout: 10000 });
      await page.click('#calc-add');
      await page.waitForTimeout(100);

      // Verify the line item was added
      const lineCount = await page.$$eval('.line-row:not(.line-head):not(.wage-details)', rows => rows.length);
      expect(lineCount).toBeGreaterThanOrEqual(1);

      // Check the last added wage line
      const wageRow = page.locator('[data-line-item-type="wages"]').first();
      await expect(wageRow).toBeVisible({ timeout: 10000 });
      const description = await wageRow.locator('input[name="item_description"]').inputValue();
    
    const quantity = await wageRow.locator('input[name="item_qty"]').inputValue();
        expect(quantity).toBe('1');

        const rate = await wageRow.locator('input[name="item_rate"]').inputValue();
                expect(rate).toBe('540');

                const amount = await wageRow.locator('.line-amount').textContent();
                expect(amount).toBe('$540.00');
    
    expect(page._jsErrors).toEqual([]);
  });

  test('Changing week start does not clear selected days', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Select Monday and Wednesday in Dates & Notes
    await page.check('#wage-days input[name="wage_day"][data-day="Mon"]');
    await page.check('#wage-days input[name="wage_day"][data-day="Wed"]');
    await page.waitForTimeout(100);
    
    // Change week start to the following Monday
    await page.fill('#week_start', '2026-08-31');
    await page.waitForTimeout(100);
    
    // Verify Monday and Wednesday are still selected in Dates & Notes
    const monChecked = await page.isChecked('#wage-days input[name="wage_day"][data-day="Mon"]');
    const wedChecked = await page.isChecked('#wage-days input[name="wage_day"][data-day="Wed"]');
    expect(monChecked).toBe(true);
    expect(wedChecked).toBe(true);
    
    // Verify the same in Wage Calculator
    const monCheckedCalc = await page.locator('#calc-days-standard input[data-day="Mon"]');
    const wedCheckedCalc = await page.locator('#calc-days-standard input[data-day="Wed"]');
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
    
    expect(page._jsErrors).toEqual([]);
  });
});