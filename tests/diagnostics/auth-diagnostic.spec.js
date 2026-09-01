const { test, expect } = require('@playwright/test');

test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Auth Diagnostic', () => {
  test('check invoice page access with storage state', async ({ page }) => {
    // 1. open /invoices/new
    await page.goto('/invoices/new');
    
    // 2. print requested URL
    console.log('requested URL: /invoices/new');
    
    // 3. print final URL
    const finalURL = page.url();
    console.log('final URL:', finalURL);
    
    // 4. print HTTP response status if available
    // We can get the response from the goto promise
    const response = await page.goto('/invoices/new');
    const status = response ? response.status() : null;
    console.log('response status:', status);
    
    // 5. print whether form#invoice-form exists
    const invoiceFormCount = await page.locator('form#invoice-form').count();
    console.log('invoice form count:', invoiceFormCount);
    
    // 6. print whether the representative login form exists
    // Assuming the login form has a specific selector, e.g., form.stack:not(.login-admin-form) or just a form with login fields
    // We'll use a generic login form selector from the auth.setup: form.stack:not(.login-admin-form)
    const loginFormCount = await page.locator('form.stack:not(.login-admin-form)').count();
    console.log('rep login form count:', loginFormCount);
    
    // 7. print current cookie names only
    const cookies = await page.context().cookies();
    const cookieNames = cookies.map(c => c.name);
    console.log('cookie names:', JSON.stringify(cookieNames));
    
    // Optional: a clear assertion if desired, e.g., expect to be on invoice page and not login
    // But we are not required to assert, just print.
  });
});