const { test, expect } = require('@playwright/test');

test.describe('Wage Calculator Diagnostic', () => {
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

  test('diagnose wage calculator elements', async ({ page }) => {
    // Enable comprehensive logging
    page.on('console', msg => console.log(`BROWSER CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));
    
    // Log current state
    console.log('URL:', page.url());
    console.log('TITLE:', await page.title());
    
    // Check for wage calculator container
    const wageCalcContainer = page.locator('[data-testid="wage-calculator"]');
    const wageCalcCount = await wageCalcContainer.count();
    console.log('Wage calculator container [data-testid="wage-calculator"] count:', wageCalcCount);
    
    if (wageCalcCount > 0) {
      const wageCalcHTML = await wageCalcContainer.first().evaluate(element => element.outerHTML);
      console.log('Wage calculator container HTML:', wageCalcHTML.substring(0, 500) + '...');
    }
    
    // Check for the specific elements we're trying to interact with
    const wageMonCount = await page.locator('#wage-mon').count();
    const wageTueCount = await page.locator('#wage-tue').count();
    const wageWedCount = await page.locator('#wage-wed').count();
    const wageThuCount = await page.locator('#wage-thu').count();
    const wageFriCount = await page.locator('#wage-fri').count();
    const wageSatCount = await page.locator('#wage-sat').count();
    
    console.log('Wage checkbox counts:');
    console.log('  #wage-mon:', wageMonCount);
    console.log('  #wage-tue:', wageTueCount);
    console.log('  #wage-wed:', wageWedCount);
    console.log('  #wage-thu:', wageThuCount);
    console.log('  #wage-fri:', wageFriCount);
    console.log('  #wage-sat:', wageSatCount);
    
    // Check for elements with data-worked-day attribute
    const workedDayElements = await page.locator('[data-worked-day]').all();
    console.log('Elements with [data-worked-day]:', workedDayElements.length);
    
    for (const element of workedDayElements) {
      const tag = await element.evaluate(el => el.tagName);
      const id = await element.evaluate(el => el.id);
      const type = await element.evaluate(el => el.type);
      const day = await element.evaluate(el => el.getAttribute('data-worked-day'));
      const role = await element.evaluate(el => el.getAttribute('role'));
      const text = await element.evaluate(el => el.textContent?.trim());
      const hidden = await element.evaluate(el => el.hidden);
      const disabled = await element.evaluate(el => el.disabled);
      
      console.log(`  <${tag} id="${id}" type="${type}" data-worked-day="${day}" role="${role}" text="${text}" hidden="${hidden}" disabled="${disabled}">`);
    }
    
    // Check for checkboxes specifically
    const wageCheckboxes = await page.locator('input[type="checkbox"]').all();
    console.log('All checkboxes:', wageCheckboxes.length);
    
    for (const checkbox of wageCheckboxes) {
      const id = await checkbox.evaluate(el => el.id);
      const name = await checkbox.evaluate(el => el.name);
      const type = await checkbox.evaluate(el => el.type);
      const checked = await checkbox.evaluate(el => el.checked);
      const disabled = await checkbox.evaluate(el => el.disabled);
      const value = await checkbox.evaluate(el => el.value);
      
      console.log(`  Checkbox: id="${id}" name="${name}" type="${type}" value="${value}" checked="${checked}" disabled="${disabled}"`);
    }
    
    // Try to find elements by role or text
    const monByRole = await page.getByRole('checkbox', { name: /mon/i }).count();
    const tueByRole = await page.getByRole('checkbox', { name: /tue/i }).count();
    const wedByRole = await page.getByRole('checkbox', { name: /wed/i }).count();
    const thuByRole = await page.getByRole('checkbox', { name: /thu/i }).count();
    const friByRole = await page.getByRole('checkbox', { name: /fri/i }).count();
    const satByRole = await page.getByRole('checkbox', { name: /sat/i }).count();
    
    console.log('Checkboxes by role (name contains):');
    console.log('  Mon:', monByRole);
    console.log('  Tue:', tueByRole);
    console.log('  Wed:', wedByRole);
    console.log('  Thu:', thuByRole);
    console.log('  Fri:', friByRole);
    console.log('  Sat:', satByRole);
    
    // Check if we're on the right page by looking for other expected elements
    const weekStartInput = await page.locator('#week_start').count();
    const customerNameInput = await page.locator('#customer_name').count();
    const submitInvoiceBtn = await page.locator('#submit-invoice-btn').count();
    
    console.log('Other form elements:');
    console.log('  #week_start:', weekStartInput);
    console.log('  #customer_name:', customerNameInput);
    console.log('  #submit-invoice-btn:', submitInvoiceBtn);
    
    // Take a screenshot for visual diagnosis
    await page.screenshot({
      path: 'test-results/wage-control-diagnostic.png',
      fullPage: true,
    });
    console.log('Screenshot saved to test-results/wage-control-diagnostic.png');
    
    // Check for any visible error messages on the page
    const errorMessages = await page.locator('.flash-error').allTextContents();
    if (errorMessages.length > 0) {
      console.log('Visible error messages:', errorMessages);
    }
    
    const successMessages = await page.locator('.flash-success').allTextContents();
    if (successMessages.length > 0) {
      console.log('Visible success messages:', successMessages);
    }
  });
});