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

    // Login as administrator first
    await page.goto('/login');
    
    // Handle the login screen - select administrator option if present
    const adminLabel = page.locator('p:has-text("Administrator")');
    if (await adminLabel.count() > 0) {
      await adminLabel.first().click();
      await page.waitForTimeout(500);
    }
    
    // Fill in the admin login form
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'changeme');
    
    // Click the admin sign in button
    await page.click('button:has-text("Admin sign in")');
    
    // Wait for login to complete (redirect to dashboard or invoices)
    await page.waitForTimeout(2000);
    
    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    await page.waitForTimeout(1000); // Wait for page to load
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
    
    // Expected: Week of 24–28 Aug 2026 (Monday to Friday of the week containing 2026-08-24)
    // 2026-08-24 IS a Monday
    expect(weekHeader).toBe('Week of 24–28 Aug 2026');
    
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
    expect(totalText).toBe('$181.82');
    
    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon: $181.82');
    expect(breakdown).toContain('→ $181.82');
    
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
    expect(totalText).toBe('$181.82');
    
    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Wed: $181.82');
    expect(breakdown).toContain('→ $181.82');
    
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
    expect(totalText).toBe('$363.64'); // 2 days * 181.82
    
    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon: $181.82');
    expect(breakdown).toContain('Fri: $181.82');
    expect(breakdown).not.toContain('Wed:');
    expect(breakdown).toContain('→ $363.64');
    
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
    expect(totalText).toBe('$545.46');
    
    const breakdown = await page.textContent('#calc-breakdown');
    expect(breakdown).toContain('Mon: $181.82');
    expect(breakdown).toContain('Wed: $181.82');
    expect(breakdown).toContain('Fri: $181.82');
    expect(breakdown).toContain('→ $545.46');
    
    // Untoggle Wed using Dates & Notes
    await page.uncheck('[data-day="Wed"]');
    await page.waitForTimeout(100);
    
    const totalAfterUntoggle = await page.textContent('#calc-total');
    expect(totalAfterUntoggle).toBe('$363.64');
    
    const breakdownAfter = await page.textContent('#calc-breakdown');
    expect(breakdownAfter).toContain('Mon: $181.82');
    expect(breakdownAfter).toContain('Fri: $181.82');
    expect(breakdownAfter).not.toContain('Wed:');
    expect(breakdownAfter).toContain('→ $363.64');
    
    // Verify no page errors
    expect(page._jsErrors).toEqual([]);
  });

  test('Add the shared week to the invoice', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Start with no days selected - uncheck all first
    const calcCheckboxes = await page.locator('#calc-days input[data-day]').all();
    for (const checkbox of calcCheckboxes) {
      if (await checkbox.isChecked()) {
        await checkbox.click();
      }
    }
    await page.waitForTimeout(100);
    
    // Select Mon, Wed, Fri using data-day attribute - use click instead of check
    const checkboxes = await page.locator('#calc-days input[data-day]').all();
    for (let i = 0; i < checkboxes.length; i++) {
      const day = await checkboxes[i].getAttribute('data-day');
      const isChecked = await checkboxes[i].isChecked();
      if (['Mon', 'Wed', 'Fri'].includes(day)) {
        if (!isChecked) {
          await checkboxes[i].click();
        }
      } else {
        if (isChecked) {
          await checkboxes[i].click();
        }
      }
    }
    await page.waitForTimeout(500); // Increase wait
    
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
    const lineCount = await page.$$eval('.line-row:not(.line-head)', rows => rows.length);
    expect(lineCount).toBeGreaterThanOrEqual(1);
    
    // Check the last added line
    const lastRow = await page.$('.line-row:not(.line-head):last-child');
    const description = await lastRow.$eval('input[name="item_description"]', el => el.value);
    expect(description).toContain('Wages — week of 24–28 Aug 2026 (3 days)');
    
    const quantity = await lastRow.$eval('input[name="item_qty"]', el => el.value);
    expect(quantity).toBe('1');
    
    const rate = await lastRow.$eval('input[name="item_rate"]', el => el.value);
    expect(rate).toBe('545.46');
    
    const amount = await lastRow.$eval('.line-amount', el => el.textContent);
    expect(amount).toBe('$545.46');
    
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