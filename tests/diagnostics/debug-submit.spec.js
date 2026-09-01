const { test, expect } = require('@playwright/test');

test.describe('Debug Form Submit', () => {
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

    // Login as E2E test rep
    await page.goto('/login');
    
    // Wait for login form to be ready
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    
    // Select E2E Test Representative
    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name="pin"]', '1234');
    
    // Submit the form
    await page.click('button:has-text("Sign in")');
    
    // Wait for login to complete (redirect to dashboard)
    await page.waitForURL('**/', { waitUntil: 'networkidle' });
  });

  test('debug form submit and redirect', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached' });
    
    // Add customer details
    await page.fill('#customer_name', 'Debug Test Customer');
    await page.fill('#customer_address', '123 Debug Street');
    
    // Add a line item
    await page.click('#add-line');
    await page.waitForTimeout(100);
    
    // Fill in the line item
    const lineRow = page.locator('.line-row:not(.line-head)').last();
    await lineRow.locator('input[name="item_description"]').fill('Debug Item');
    await lineRow.locator('input[name="item_qty"]').fill('1');
    await lineRow.locator('input[name="item_rate"]').fill('100');
    await page.waitForTimeout(100);
    
    // Check the action field value before submit
    const actionBefore = await page.locator('#action-field').inputValue();
    console.log('Action field before:', actionBefore);
    
    // Click submit-draft and wait
    await page.click('#submit-draft');
    
    // Wait a bit and check for errors
    await page.waitForTimeout(2000);
    
    // Check for any flash errors
    const flashError = await page.locator('.flash-error').first().textContent().catch(() => null);
    console.log('Flash error:', flashError);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after submit:', currentUrl);
    
    // Check if we're still on new invoice page
    const onNewPage = currentUrl.includes('/invoices/new');
    console.log('Still on new page:', onNewPage);
    
    // Check for any console errors
    console.log('JS Errors:', page._jsErrors);
    console.log('Console messages:', page._consoleMessages.slice(-20));
    
    // Take screenshot
    await page.screenshot({ path: 'debug-submit.png' });
  });
});