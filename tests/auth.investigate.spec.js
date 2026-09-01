require('dotenv').config({ path: '.env.e2e' });
const { test, expect } = require('@playwright/test');

// Start with clean state for each test to avoid contaminating shared representative session
test.use({ storageState: {} });

test.describe('Authentication Investigation', () => {
  test.beforeEach(async ({ page }) => {
    // No logout/cookie clearing - we start clean with test.use above
    // Previously was:
    // await page.request.post('/logout');
    // await page.context().clearCookies();
  });
  test('captures detailed login POST response and environment', async ({ page }) => {
    // Enable comprehensive logging
    page.on('console', msg => console.log(`BROWSER CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));

    // Go to login page
    await page.context().clearCookies();
    await page.goto('/login');

    // Wait for login form to be ready
    await page.waitForSelector('form.login-admin-form', { state: 'attached' });

    // Inspect the form to confirm field names
    const usernameInput = await page.locator('form.login-admin-form input[name="username"]');
    const passwordInput = await page.locator('form.login-admin-form input[name="password"]');
    const loginTypeInput = await page.locator('form.login-admin-form input[name="login_type"]');
    const submitButton = await page.locator('form.login-admin-form button:has-text("Admin sign in")');

    console.log('FORM FIELD CHECK:');
    console.log('- username input exists:', await usernameInput.count() > 0);
    console.log('- password input exists:', await passwordInput.count() > 0);
    console.log('- login_type input exists:', await loginTypeInput.count() > 0);
    console.log('- submit button exists:', await submitButton.count() > 0);

    if (await loginTypeInput.count() > 0) {
      const loginTypeValue = await loginTypeInput.getAttribute('value');
      console.log('- login_type value:', loginTypeValue);
    }

    // Capture the login response with detailed information
    const loginResponsePromise = page.waitForResponse(response => {
      const isLoginPost = (
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/login'
      );
      if (isLoginPost) {
        console.log('\n=== LOGIN POST DETECTED ===');
        console.log('URL:', response.url());
        console.log('Method:', response.request().method());
        console.log('Status:', response.status());
        console.log('Status Text:', response.statusText());
      }
      return isLoginPost;
    });

    // Fill in the admin login form
    await page.fill('form.login-admin-form input[name="username"]', process.env.E2E_ADMIN_USERNAME);
    await page.fill('form.login-admin-form input[name="password"]', process.env.E2E_ADMIN_PASSWORD);

    console.log('\n=== SUBMITTING FORM ===');
    console.log('Username filled: admin');
    console.log('Password filled: changeme');

    // Submit the form
    await page.click('form.login-admin-form button:has-text("Admin sign in")');

    // Wait for and capture the login response
    const loginResponse = await loginResponsePromise;

    console.log('\n=== LOGIN RESPONSE DETAILS ===');
    console.log('STATUS:', loginResponse.status());
    console.log('STATUS TEXT:', loginResponse.statusText());
    console.log('URL:', loginResponse.url());

    const headers = await loginResponse.allHeaders();
    console.log('HEADERS:');
    Object.keys(headers).forEach(key => {
      console.log(`  ${key}: ${headers[key]}`);
    });

    // Get response body if it's text
    const contentType = headers['content-type'] || '';
    console.log('CONTENT-TYPE:', contentType);

    if (contentType.includes('text') || contentType.includes('html') || !contentType) {
      try {
        const body = await loginResponse.text();
        console.log('BODY (first 2000 chars):');
        console.log(body.slice(0, 2000));

        // Check if it contains error messages
        if (body.includes('Incorrect username or password')) {
          console.log('\n>>> AUTHENTICATION FAILED: Invalid credentials <<<');
        } else if (body.includes('Select your name')) {
          console.log('\n>>> Shows rep login form instead <<<');
        }
      } catch (e) {
        console.log('Could not read response body:', e.message);
      }
    } else {
      console.log('Body is not text (likely binary or redirect)');
    }

    // Check current state after login attempt
    console.log('\n=== POST-LOGIN STATE ===');
    console.log('CURRENT URL:', page.url());
    console.log('PAGE TITLE:', await page.title());

    // Check for any visible error messages
    const errorMsgElements = await page.locator('.flash-error');
    let errorMsg = '';
    if (await errorMsgElements.count() > 0) {
      errorMsg = await errorMsgElements.first().textContent();
    }
    if (errorMsg) {
      console.log('VISIBLE ERROR MESSAGE:', errorMsg.trim());
    }

    // Check for success indicators
    const successMsgElements = await page.locator('.flash-success');
    let successMsg = '';
    if (await successMsgElements.count() > 0) {
      successMsg = await successMsgElements.first().textContent();
    }
    if (successMsg) {
      console.log('VISIBLE SUCCESS MESSAGE:', successMsg.trim());
    }

    // Check cookies
    const cookies = await page.context().cookies();
    console.log('\n=== COOKIES ===');
    if (cookies.length === 0) {
      console.log('No cookies found');
    } else {
      cookies.forEach(cookie => {
        console.log(`  ${cookie.name}: ${cookie.value.substring(0, 20)}... [${cookie.domain}] path=${cookie.path} httpOnly=${cookie.httpOnly} secure=${cookie.secure} sameSite=${cookie.sameSite}`);
      });
    }

    // Try to navigate to some common pages to see what's accessible
    console.log('\n=== ACCESSIBILITY CHECKS ===');

    // Try to go to dashboard
    await page.goto('/');
    console.log('After navigating to /:');
    console.log('  URL:', page.url());
    console.log('  Title:', await page.title());

    // Check if we see dashboard elements
    const hasRepName = await page.locator('text=Chloe Boyle').count() > 0;
    console.log('  Shows rep name (Chloe Boyle):', hasRepName);

    // Try to go to invoices page
    await page.goto('/invoices');
    console.log('\nAfter navigating to /invoices:');
    console.log('  URL:', page.url());
    console.log('  Title:', await page.title());

    // Try to go to new invoice page
    await page.goto('/invoices/new');
    console.log('\nAfter navigating to /invoices/new:');
    console.log('  URL:', page.url());
    console.log('  Title:', await page.title());

    // Check for the week_start input
    const weekStartExists = await page.locator('#week_start').count() > 0;
    console.log('  Week start input exists:', weekStartExists);

    if (weekStartExists) {
      const weekStartValue = await page.locator('#week_start').inputValue();
      console.log('  Week start value:', weekStartValue || '(empty)');

      // Try to fill it
      try {
        await page.fill('#week_start', '2026-08-24');
        const afterFill = await page.locator('#week_start').inputValue();
        console.log('  After fill attempt:', afterFill);
      } catch (e) {
        console.log('  Failed to fill week_start:', e.message);
      }
    }

    // Final summary
    console.log('\n=== SUMMARY ===');
    console.log('Login POST status:', loginResponse.status());
    console.log('Login POST redirected to:', loginResponse.url());
    console.log('Final page URL after all navigations:', page.url());
    console.log('Authenticated access to /invoices/new:', weekStartExists);
  });
});