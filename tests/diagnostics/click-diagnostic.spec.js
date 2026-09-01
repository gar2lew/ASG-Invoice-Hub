const { test, expect } = require('@playwright/test');

test.describe('Click Diagnostic', () => {
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
      // Login as rep first (Chloe Boyle with PIN 1234) - THIS WORKS
      // Select Chloe Boyle (we know she exists from our debugging)
      await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' }); // Chloe Boyle's ID
      await page.fill('input[name="pin"]', '1234');

      // Submit the form
      await page.click('button:has-text("Sign in")');

      // Wait for login to complete (redirect to dashboard)
      await page.waitForURL('**/');
    }

    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    // Wait for the page to load and invoice form to be available
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });

  test('debug click on wage calculator label', async ({ page }) => {
    // Use evaluate to manipulate checkboxes since they're hidden
    const results = await page.evaluate(() => {
      const monCalcCheckbox = document.querySelector('#calc-days input[data-day="Mon"]');
      const monWageCheckbox = document.querySelector('#wage-days input[name="wage_day"][data-day="Mon"]');
      
      const initial = {
        calcChecked: monCalcCheckbox.checked,
        wageChecked: monWageCheckbox.checked
      };
      
      // Uncheck calc checkbox
      monCalcCheckbox.checked = false;
      monCalcCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Get state after uncheck
      const afterUncheck = {
        calcChecked: monCalcCheckbox.checked,
        wageChecked: monWageCheckbox.checked
      };
      
      // Check calc checkbox
      monCalcCheckbox.checked = true;
      monCalcCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Get state after check
      const afterCheck = {
        calcChecked: monCalcCheckbox.checked,
        wageChecked: monWageCheckbox.checked
      };
      
      // Now click the label (which should work since it's visible)
      const label = document.querySelector('#calc-days .calc-day:has(input[data-day="Mon"])');
      if (label) {
        label.click();
      }
      
      const afterLabelClick = {
        calcChecked: monCalcCheckbox.checked,
        wageChecked: monWageCheckbox.checked
      };
      
      return { initial, afterUncheck, afterCheck, afterLabelClick };
    });
    
    console.log('Results:', JSON.stringify(results, null, 2));
  });
});