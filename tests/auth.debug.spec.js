require('dotenv').config({ path: '.env.e2e' });
const { test, expect } = require('@playwright/test');
test.describe('Authentication Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Log out to clear any existing session (from storage state)
    await page.request.post('/logout');
    // Clear cookies to remove the session ID
    await page.context().clearCookies();
  });
  test('admin can log in and redirect correctly', async ({ page }) => {
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
    // Fill in the admin login form
    await page.fill('form.login-admin-form input[name=\"username\"]', process.env.E2E_ADMIN_USERNAME);
    await page.fill('form.login-admin-form input[name=\"password\"]', process.env.E2E_ADMIN_PASSWORD);
    // Submit the form
    await page.click('form.login-admin-form button:has-text("Admin sign in")');
    // Wait for and capture the login response
    const loginResponse = await loginResponsePromise;
    console.log('LOGIN STATUS:', loginResponse.status());
    console.log('LOGIN URL:', loginResponse.url());
    const headers = await loginResponse.allHeaders();
    console.log('LOGIN HEADERS:', JSON.stringify(headers, null, 2));
    // Get response body if it's text
    const contentType = headers['content-type'] || '';
    if (contentType.includes('text')) {
      try {
        const body = await loginResponse.text();
        console.log('LOGIN BODY (first 2000 chars):', body.slice(0, 2000));
      } catch (e) {
        console.log('Could not read response body:', e.message);
      }
    }
    // Check current state after login attempt
    console.log('CURRENT URL:', page.url());
    console.log('PAGE TITLE:', await page.title());
    // Check for any visible error messages
    const errorMsgElements = await page.locator('.flash-error');
    let errorMsg = '';
    if (await errorMsgElements.count() > 0) {
      errorMsg = await errorMsgElements.first().textContent();
    }
    if (errorMsg) {
      console.log('VISIBLE ERROR:', errorMsg);
    }
    // Check cookies
    const cookies = await page.context().cookies();
    console.log('COOKIES:', JSON.stringify(cookies.map(c => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite
    })), null, 2));
    // Wait a bit to see if redirect happens
    await page.waitForTimeout(2000);
    console.log('URL after 2s wait:', page.url());
    // Try to wait for redirect to homepage
    try {
      await page.waitForURL('**/', { timeout: 5000 });
      console.log('Successfully redirected to homepage');
    } catch (err) {
      console.log('Failed to redirect to homepage after 5s:', err.message);
    }
  });
});