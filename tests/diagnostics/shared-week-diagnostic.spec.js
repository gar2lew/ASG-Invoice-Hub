// tests/shared-week.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Shared Week State - Diagnostic', () => {
  test('can see login page and submit admin form', async ({ page }) => {
    // Set up console and error logging
    page.on('console', msg => console.log(`BROWSER CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER PAGE ERROR: ${err.message}`));
    page.on('response', async res => {
      if (res.status() >= 400) {
        console.log(`HTTP ERROR: ${res.status()} ${res.url()}`);
      }
      // Log all responses for login request
      if (res.url().includes('/login') && res.request().method() === 'POST') {
        console.log(`LOGIN RESPONSE: ${res.status()} ${res.url()}`);
        const text = await res.text();
        console.log(`LOGIN RESPONSE BODY (first 500 chars): ${text.substring(0, 500)}`);
        // Check if it's a redirect
        if (res.headers()['location']) {
          console.log(`REDIRECT TO: ${res.headers()['location']}`);
        }
      }
    });

    // Go to login page
    await page.goto('/login');
    console.log('After goto login URL:', page.url());
    await page.screenshot({ path: 'test-results/1-login-page.png', fullPage: true });

    // Select the ADMIN login form (second form on the page)
    const adminForm = page.locator('form.login-admin-form');
    if (await adminForm.count() > 0) {
      console.log('Found ADMIN login form');
      
      // Fill in credentials for administrator login
      await adminForm.locator('input[name="username"]').fill('admin');
      await adminForm.locator('input[name="password"]').fill('changeme');
      
      console.log('Filled admin login form');
      
      // Submit the form and wait for response
      const [response] = await Promise.all([
        adminForm.click('button[type="submit"]:has-text("Admin sign in")'),
        page.waitForResponse(response => 
          response.url().includes('/login') && 
          response.request().method() === 'POST'
        )
      ]);
      
      console.log('Form submitted, waiting for response...');
    } else {
      console.log('ERROR: Could not find admin login form');
      await page.screenshot({ path: 'test-results/error-no-admin-form.png', fullPage: true });
      throw new Error('Admin login form not found');
    }

    // Wait a bit for any navigation
    await page.waitForTimeout(2000);
    
    console.log('After login attempt URL:', page.url());
    await page.screenshot({ path: 'test-results/2-after-login-attempt.png', fullPage: true });

    // Check for error messages
    const errorMessages = await page.locator('.flash-flash-error, .flash-error, .alert-error').all();
    for (const error of errorMessages) {
      const text = await error.innerText();
      if (text.trim()) {
        console.log('Error message found:', text);
      }
    }

    // Check if we have any success indicators (like being redirected)
    if (page.url().includes('/dashboard') || page.url().includes('/invoices/new')) {
      console.log('SUCCESS: Appears to have logged in and redirected');
    } else if (page.url().includes('/login')) {
      console.log('STILL ON LOGIN PAGE: Login may have failed');
    } else {
      console.log('ON UNEXPECTED PAGE:', page.url());
    }

    // If we are not already on /invoices/new, try to go there
    if (!page.url().includes('/invoices/new')) {
      console.log('Not on invoices/new, navigating there');
      await page.goto('/invoices/new');
    }
    console.log('After navigating to invoices/new URL:', page.url());
    await page.screenshot({ path: 'test-results/3-invoices-new.png', fullPage: true });

    // Now check for the week_start element
    const weekStartLocator = page.locator('#week_start');
    console.log('Week start locator count:', await weekStartLocator.count());
    if (await weekStartLocator.count() > 0) {
      console.log('Week start element is present');
      await weekStartLocator.fill('2026-08-24');
      console.log('Filled week start with 2026-08-24');
    } else {
      console.log('Week start element NOT found');
      // Let's see what inputs are present
      const inputs = await page.locator('input').all();
      console.log('Total inputs found:', inputs.length);
      for (let i = 0; i < Math.min(inputs.length, 10); i++) {
        const id = await inputs[i].getAttribute('id');
        const name = await inputs[i].getAttribute('name');
        const type = await inputs[i].getAttribute('type');
        console.log(`Input ${i}: id=${id}, name=${name}, type=${type}`);
      }
      // Also check the body content
      const bodyText = await page.locator('body').innerText();
      console.log('Body text (first 2000 chars):', bodyText.slice(0, 2000));
    }

    // We expect this to pass if we can fill the week_start
    await expect(weekStartLocator).toBeVisible();
    await expect(weekStartLocator).toBeEnabled();
  });
});