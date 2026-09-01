const { test, expect } = require('@playwright/test');

test.describe('Rep Login Debug', () => {
  test('rep can log in', async ({ page }) => {
    // Enable console logging to see errors
    page.on('console', msg => console.log(`BROWSER CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));
    
    // Go to login page
    await page.goto('/login');
    
    // Wait for login form to be ready
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    
    // Select Chloe Boyle (ID 2 from the debug output) and enter a PIN
    // Since we don't know the PIN, let's see what options are available first
    const repOptions = await page.locator('select[name="user_id"] option').allTextContents();
    console.log('Available reps:', repOptions);
    
    // Try to log in as first available rep with a dummy PIN to see the error
    await page.selectOption('select[name="user_id"]', repOptions[1]); // Skip the first empty option
    await page.fill('input[name="pin"]', '1234');
    
    // Capture the login response
    const loginResponsePromise = page.waitForResponse(response => {
      return (
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/login'
      );
    });
    
    // Submit the form
    await page.click('button:has-text("Sign in")');
    
    // Wait for and capture the login response
    const loginResponse = await loginResponsePromise;
    
    console.log('REP LOGIN STATUS:', loginResponse.status());
    console.log('REP LOGIN URL:', loginResponse.url());
    
    // Get response body if it's text and not a redirect
    const contentType = (await loginResponse.allHeaders())['content-type'] || '';
    if (contentType.includes('text') && loginResponse.status() < 300) {
      const body = await loginResponse.text();
      console.log('REP LOGIN BODY (first 500 chars):', body.slice(0, 500));
    } else if (loginResponse.status() >= 300) {
      console.log('REP LOGIN IS A REDIRECT (status:', loginResponse.status(), ')');
    }
    
    // Check current state after login attempt
    console.log('CURRENT URL after rep login attempt:', page.url());
    
    // Check for any visible error messages
    const errorMsg = await page.locator('.flash-error').first().textContent();
    if (errorMsg) {
      console.log('VISIBLE ERROR:', errorMsg);
    }
  });
});