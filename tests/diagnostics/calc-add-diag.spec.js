const { test, expect } = require('@playwright/test');

test.describe('Calc-Add Diagnostic', () => {
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

    // Navigate to login page - if already logged in via storage state, we'll be redirected to dashboard
    await page.goto('/login');
    // Check if login form is present (means we need to log in)
    let loginFormVisible = false;
    try {
      await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached', timeout: 5000 });
      loginFormVisible = true;
    } catch (e) {
      // Login form not found, assume we are already logged in and redirected to dashboard
    }

    if (loginFormVisible) {
      // Log in as E2E Test Representative
      await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
      await page.fill('input[name="pin"]', '1234');
      await page.click('button:has-text("Sign in")');
      await page.waitForURL('**/');
    }

    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });

  test('debug calc-add with Mon/Wed/Fri', async ({ page }) => {
    // Reset all to unchecked
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      await page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`).click();
    }
    await page.waitForTimeout(100);
    
    // Check Mon, Wed, Fri in calc-days
    await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Wed"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Fri"])').click();
    await page.waitForTimeout(100);
    
    // Check if the change event fired by looking at weekState
    const weekState = await page.evaluate(() => window.weekState);
    console.log('weekState after clicks:', weekState);
    
    // Also check calc-breakdown
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    console.log('calc-breakdown:', calcBreakdown);
    const calcTotal = await page.locator('#calc-total').textContent();
    console.log('calc-total:', calcTotal);
    
    // Check lines before
    const linesBefore = await page.locator('#lines .line-row:not(.line-head)').count();
    console.log('Line rows before:', linesBefore);
    
    // Click calc-add
    await page.click('#calc-add');
    await page.waitForTimeout(100);
    
    // Check lines after
    const linesAfter = await page.locator('#lines .line-row:not(.line-head)').count();
    console.log('Line rows after:', linesAfter);
    
    if (linesAfter > 0) {
      for (let i = 0; i < linesAfter; i++) {
        const itemDesc = await page.locator('#lines input[name="item_description"]').nth(i).inputValue();
        const itemQty = await page.locator('#lines input[name="item_qty"]').nth(i).inputValue();
        const itemRate = await page.locator('#lines input[name="item_rate"]').nth(i).inputValue();
        console.log(`Line ${i}: desc="${itemDesc}", qty="${itemQty}", rate="${itemRate}"`);
      }
    }
  });
});