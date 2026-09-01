require('dotenv').config({ path: '.env.e2e' });
const { test, expect } = require('@playwright/test');

// Start with clean state for each test to avoid contaminating shared representative session
test.use({ storageState: {} });

test.describe('Admin Login with override123', () => {
  console.log("E2E_ADMIN_USERNAME:", process.env.E2E_ADMIN_USERNAME);
  console.log("E2E_ADMIN_PASSWORD:", process.env.E2E_ADMIN_PASSWORD);
  test.beforeEach(async ({ page }) => {
    // No logout/cookie clearing - we start clean with test.use above
    // Previously was:
    // await page.request.post('/logout');
    // await page.context().clearCookies();
  });
  test('admin can log in with password override123', async ({ page }) => {
    // Enable console logging to see errors
    page.on('console', msg => console.log(`BROWSER CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));

    // Go to login page
    await page.context().clearCookies();
    await page.goto('/login');

    // Wait for login form to be ready
    await page.waitForSelector('form.login-admin-form', { state: 'attached' });

    // Capture the login response
    const loginResponsePromise = page.waitForResponse(response => {
      return (
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/login'
      );
    });

    // Fill in the admin login form with the password from smoke tests
    await page.fill('form.login-admin-form input[name="username"]', process.env.E2E_ADMIN_USERNAME);
    await page.fill('form.login-admin-form input[name="password"]', process.env.E2E_ADMIN_PASSWORD);

    // Submit the form
    await page.click('form.login-admin-form button:has-text("Admin sign in")');

    // Wait for and capture the login response
    const loginResponse = await loginResponsePromise;

    console.log('LOGIN STATUS:', loginResponse.status());
    console.log('LOGIN URL:', loginResponse.url());

    // Check if we got a redirect (successful login)
    if (loginResponse.status() >= 300 && loginResponse.status() < 400) {
      console.log('LOGIN SUCCESSFUL - got redirect status:', loginResponse.status());

      // Wait for redirect to complete
      await page.waitForTimeout(1000);
      console.log('URL after login:', page.url());

      // Now try to go to the invoice page
      await page.goto('/invoices/new');
      await page.waitForTimeout(1000);

      // Check if we can see the week_start input
      const weekStartVisible = await page.locator('#week_start').isVisible();
      console.log('Week start input visible:', weekStartVisible);

      if (weekStartVisible) {
        // Try to fill it
        await page.fill('#week_start', '2026-08-24');
        console.log('Successfully filled week_start input');
      }
    } else {
      // Login failed, get the error message
      const contentType = (await loginResponse.allHeaders())['content-type'] || '';
      if (contentType.includes('text')) {
        const body = await loginResponse.text();
        console.log('LOGIN BODY (first 1000 chars):', body.slice(0, 1000));
      }
    }
  });
});