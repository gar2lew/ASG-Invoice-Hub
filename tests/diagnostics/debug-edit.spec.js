const { test, expect } = require('@playwright/test');

test.describe('Invoice Edit Route', () => {
  test.beforeEach(async ({ page }) => {
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

  test('debug edit route', async ({ page }) => {
    // First create an invoice
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached' });
    
    // Fill in basic info
    await page.fill('#customer_name', 'Edit Test Customer');
    await page.fill('#customer_address', '123 Edit Street');
    
    // Save as draft
    await page.click('#submit-draft');
    await page.waitForTimeout(2000);
    
    // Should redirect to invoice view
    await page.waitForURL(/\/invoices\/\d+/);
    const viewUrl = page.url();
    const invoiceIdMatch = viewUrl.match(/\/invoices\/(\d+)/);
    console.log('Invoice ID match:', invoiceIdMatch);
    expect(invoiceIdMatch).toBeTruthy();
    const invoiceId = invoiceIdMatch[1];
    console.log('Invoice ID:', invoiceId);
    
    // Now try to edit it
    const editUrl = `/invoices/${invoiceId}/edit`;
    console.log('Navigating to:', editUrl);
    await page.goto(editUrl);
    
    // Wait a bit and see what we get
    await page.waitForTimeout(2000);
    
    // Check what page we're on
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for any error messages on page
    const pageContent = await page.content();
    console.log('Page contains error:', pageContent.includes('error') || pageContent.includes('Error'));
    
    // Look for the form
    const formExists = await page.locator('form#invoice-form').count();
    console.log('Form exists:', formExists > 0);
    
    // Take a screenshot for debugging if needed
    // await page.screenshot({ path: 'debug-edit.png' });
  });
});