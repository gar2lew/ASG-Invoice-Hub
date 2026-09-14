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

  async function setDayState(page, day, state) {
    const btn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn[data-state="${state}"], #calc-days-sat .calc-day[data-day="${day}"] .day-btn[data-state="${state}"]`);
    await btn.click();
    await page.waitForTimeout(50);
  }

  async function getDayState(page, day) {
    const activeBtn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn-active, #calc-days-sat .calc-day[data-day="${day}"] .day-btn-active`);
    return await activeBtn.getAttribute('data-state');
  }

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

    // Clear all days first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    // Select Monday Full in Wage Calculator
    await setDayState(page, 'Mon', 'full');
    await page.waitForTimeout(100);

    const monState = await getDayState(page, 'Mon');
    expect(monState).toBe('full');

    const tueState = await getDayState(page, 'Tue');
    expect(tueState).toBe('off');

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

    // Clear all days first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    // Click Wednesday tile in Dates & Notes (cycles off -> full)
    await page.locator('#wage-days .wage-day-tile[data-day="Wed"]').click();
    await page.waitForTimeout(100);

    const wedState = await getDayState(page, 'Wed');
    expect(wedState).toBe('full');

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

    // Clear all days first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    // Select Mon, Wed, Fri in Wage Calculator
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Fri', 'full');
    await page.waitForTimeout(100);

    // Untoggle Wednesday from Dates & Notes (click once to cycle to half, again to off)
    await page.locator('#wage-days .wage-day-tile[data-day="Wed"]').click();
    await page.waitForTimeout(50);
    await page.locator('#wage-days .wage-day-tile[data-day="Wed"]').click();
    await page.waitForTimeout(100);

    const wedState = await getDayState(page, 'Wed');
    expect(wedState).toBe('off');

    const monState = await getDayState(page, 'Mon');
    expect(monState).toBe('full');

    const friState = await getDayState(page, 'Fri');
    expect(friState).toBe('full');

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

    // Clear all days first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    // Select Mon, Wed, Fri using Wage Calculator
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Fri', 'full');
    await page.waitForTimeout(100);

    const totalText = await page.textContent('#calc-total');
    expect(totalText).toBe('$540.00');

    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon: $180.00');
    expect(breakdown).toContain('Wed: $180.00');
    expect(breakdown).toContain('Fri: $180.00');
    expect(breakdown).toContain('→ $540.00');

    // Untoggle Wed using Dates & Notes (cycle full -> half -> off)
    await page.locator('#wage-days .wage-day-tile[data-day="Wed"]').click();
    await page.waitForTimeout(50);
    await page.locator('#wage-days .wage-day-tile[data-day="Wed"]').click();
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

    // Ensure all days cleared first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    // Select Mon, Wed, Fri
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Fri', 'full');
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

    // Select Monday and Wednesday
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Wed', 'full');
    await page.waitForTimeout(100);

    // Change week start to the following Monday
    await page.fill('#week_start', '2026-08-31');
    await page.waitForTimeout(100);

    // Verify Monday and Wednesday are still selected
    expect(await getDayState(page, 'Mon')).toBe('full');
    expect(await getDayState(page, 'Wed')).toBe('full');

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
