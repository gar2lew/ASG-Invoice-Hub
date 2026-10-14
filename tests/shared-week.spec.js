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
    const isSat = day === 'Sat';
    const sel = isSat
      ? `.saturday-controls .day-btn[data-state="${state}"]`
      : `.weekday[data-day="${day}"] .day-btn[data-state="${state}"]`;
    const btn = page.locator(sel);
    await btn.click();
    await page.waitForTimeout(50);
  }

  async function getDayState(page, day) {
    const isSat = day === 'Sat';
    const sel = isSat
      ? `.saturday-controls .day-btn-active`
      : `.weekday[data-day="${day}"] .day-btn-active`;
    const activeBtn = page.locator(sel);
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

    expect(weekHeader).toBe('Week of 24/08/2026 - 29/08/2026');

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
    expect(totalText).toBe('$166.67');

    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon');
    expect(breakdown).not.toContain('Tue');

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
    expect(totalText).toBe('$166.67');

    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Wed');
    expect(breakdown).not.toContain('Tue');

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
    expect(totalText).toBe('$333.33');

    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon');
    expect(breakdown).toContain('Fri');
    expect(breakdown).not.toContain('Wed:');
    expect(breakdown).not.toContain('Wed');

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
    expect(totalText).toBe('$500.00');

    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon');
    expect(breakdown).toContain('Wed');
    expect(breakdown).toContain('Fri');

    // Untoggle Wed using Dates & Notes (cycle full -> half -> off)
    await page.locator('#wage-days .wage-day-tile[data-day="Wed"]').click();
    await page.waitForTimeout(50);
    await page.locator('#wage-days .wage-day-tile[data-day="Wed"]').click();
    await page.waitForTimeout(100);

    const totalAfterUntoggle = await page.textContent('#calc-total');
    expect(totalAfterUntoggle).toBe('$333.33');

    const breakdownAfter = await page.textContent('#calc-breakdown');
    expect(breakdownAfter).toContain('Mon');
    expect(breakdownAfter).toContain('Fri');
    expect(breakdownAfter).not.toContain('Wed:');
    expect(breakdownAfter).not.toContain('Wed');

    expect(page._jsErrors).toEqual([]);
  });

  test('Selected days synchronize directly to one wage line', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Ensure all days cleared first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    // Select Mon, Wed, Fri
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Fri', 'full');

    // A wage line appears without a separate add action.
    const lineCount = await page.$$eval('.line-row:not(.line-head):not(.wage-details)', rows => rows.length);
    expect(lineCount).toBe(1);

    // Check the last added wage line
    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 10000 });
    await expect(wageRow.locator('input[name="item_description"]')).toHaveValue('Wages/Retainer - Week of 24/08/2026 - 29/08/2026');

    const quantity = await wageRow.locator('input[name="item_qty"]').inputValue();
    expect(quantity).toBe('1');

    const rate = await wageRow.locator('input[name="item_rate"]').inputValue();
    expect(rate).toBe('500');

    await page.locator('#add-line').click();
    const itemRows = page.locator('.line-row:not(.line-head):not(.wage-details)');
    await itemRows.nth(1).locator('input[name="item_description"]').fill('Parking');
    await itemRows.nth(1).locator('input[name="item_qty"]').fill('1');
    await itemRows.nth(1).locator('input[name="item_rate"]').fill('25');

    const amount = await wageRow.locator('.line-amount').textContent();
    expect(amount).toBe('$500.00');

    await page.fill('#week_start', '2026-08-31');
    await expect(wageRow.locator('input[name="item_description"]')).toHaveValue('Wages/Retainer - Week of 31/08/2026 - 05/09/2026');
    await expect(wageRow.locator('input[name="item_rate"]')).toHaveValue('500');
    await expect(wageRow.locator('..').locator('.wage-details')).toContainText('Mon - 31/08/2026');

    await page.locator('#clear-week').click();
    await expect(page.locator('[data-line-item-type="wages"]')).toHaveCount(0);
    await expect(page.locator('.line-row:not(.line-head):not(.wage-details)')).toHaveCount(1);
    await expect(itemRows.first().locator('input[name="item_description"]')).toHaveValue('Parking');
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
