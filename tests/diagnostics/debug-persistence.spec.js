const { test, expect } = require('@playwright/test');

test.describe('Wage Detail Persistence Debug', () => {
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
    
    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    // Wait for the page to load and invoice form to be available
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });

  // Helper to ensure all checkboxes are unchecked
  async function ensureAllUnchecked(page) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      const wageControl = page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`);
      const wageInput = wageControl.locator('input');

      if (await wageInput.isChecked()) {
        await wageControl.click();
      }

      await expect(wageInput).not.toBeChecked();

      await expect(
        page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]`)
      ).not.toBeChecked();
    }
  }

  test('debug wage details on edit page', async ({ page }) => {
    await ensureAllUnchecked(page);
    
    // Set week start to a known Monday (24 Aug 2026)
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);
    
    // Select Mon, Wed, Sat (Mon and Wed full days, Sat half day)
    await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Wed"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Sat"])').click();
    await page.waitForTimeout(100);
    
    // Add customer details
    await page.fill('#customer_name', 'Persistence Test Customer');
    await page.fill('#customer_address', '123 Persistence Street');
    await page.fill('#notes', 'Test notes for persistence');
    
    // Click add item button to add wage line
    await page.click('#calc-add');
    await page.waitForTimeout(500);
    
    // Find the wage line by its stable attribute
    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 5000 });
    
    // Verify primary description format
    const primaryDesc = await wageRow.locator('input[name="item_description"]').inputValue();
    console.log('Primary desc:', primaryDesc);
    expect(primaryDesc).toMatch(/Wages\/Retainer — Week of \d{2}–\d{2} [A-Za-z]{3} \d{4} — \$/);
    
    // Verify day details row exists
    const detailsRow = page.locator('.wage-details').first();
    await expect(detailsRow).toBeVisible({ timeout: 5000 });
    
    // Verify day details content
    const detailsText = await detailsRow.textContent();
    console.log('Details text:', detailsText);
    expect(detailsText).toContain('Mon — 24th');
    expect(detailsText).toContain('Wed — 26th');
    expect(detailsText).toContain('Sat — 29th (½ day)');
    
    // Save the invoice (submit draft)
    await page.click('#submit-draft');
    await page.waitForTimeout(2000);
    
    // Should redirect to invoice view page
    await page.waitForURL(/\/invoices\/\d+/);
    
    // Get the invoice ID from URL
    const invoiceUrl = page.url();
    const invoiceIdMatch = invoiceUrl.match(/\/invoices\/(\d+)/);
    expect(invoiceIdMatch).toBeTruthy();
    const invoiceId = invoiceIdMatch[1];
    console.log('Invoice ID:', invoiceId);
    
    // Navigate back to edit the invoice to verify details persist in form
    await page.goto(`/invoices/${invoiceId}/edit`);
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
    
    // Check for existingItems in window
    const existingItems = await page.evaluate(() => window.existingItems);
    console.log('window.existingItems:', existingItems);
    
    // Wait for JavaScript to restore existing items
    await page.waitForTimeout(3000);
    
    // Check all line rows
    const allRows = await page.locator('.line-row').all();
    console.log('Number of line-row elements:', allRows.length);
    
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const className = await row.getAttribute('class');
      const isWage = await row.getAttribute('data-line-item-type');
      const text = await row.textContent();
      console.log(`Row ${i}: class="${className}", data-line-item-type="${isWage}", text="${text.substring(0, 100)}"`);
    }
    
    // Check for wage-details specifically
    const wageDetailsRows = await page.locator('.wage-details').all();
    console.log('Number of .wage-details elements:', wageDetailsRows.length);
    for (let i = 0; i < wageDetailsRows.length; i++) {
      const text = await wageDetailsRows[i].textContent();
      console.log(`wage-details ${i}: "${text.substring(0, 200)}"`);
    }
    
    // Check for any elements with wage-details in class
    const allWithWageDetails = await page.locator('[class*="wage-details"]').all();
    console.log('Elements with wage-details in class:', allWithWageDetails.length);
    
    // Dump the lines container HTML
    const linesHtml = await page.locator('#lines').innerHTML();
    console.log('Lines container HTML (first 5000 chars):', linesHtml.substring(0, 5000));
  });
});