const { test, expect } = require('@playwright/test');

test.describe('Wage Calculator Detailed Diagnostic', () => {
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

    // Login as rep first (Chloe Boyle with PIN 1234) - THIS WORKS
    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    await page.selectOption('select[name="user_id"]', '2'); // Chloe Boyle's ID
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/');
    
    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });

  test('diagnose wage calculator labels and associations', async ({ page }) => {
    // Enable comprehensive logging
    page.on('console', msg => console.log(`BROWSER CONSOLE ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));
    
    // Get all labels and see what they're associated with
    const labels = await page.locator('label').all();
    console.log('Total labels on page:', labels.length);
    
    for (const label of labels) {
      const text = await label.evaluate(el => el.textContent?.trim());
      const htmlFor = await label.evaluate(el => el.htmlFor);
      console.log(`Label: text="${text}", htmlFor="${htmlFor}"`);
      
      // If this label seems to be for a weekday, try to find the associated input
      if (text && /^(mon|tue|wed|thu|fri|sat)$/i.test(text) && htmlFor && htmlFor.trim() !== '') {
        const associatedInput = page.locator(`#${htmlFor}`);
        const inputCount = await associatedInput.count();
        if (inputCount > 0) {
          const inputType = await associatedInput.evaluate(el => el.type);
          const inputName = await associatedInput.evaluate(el => el.name);
          const inputId = await associatedInput.evaluate(el => el.id);
          const inputValue = await associatedInput.evaluate(el => el.value);
          console.log(`  -> Associated input: id="${inputId}" name="${inputName}" type="${inputType}" value="${inputValue}"`);
        } else {
          console.log(`  -> No input found with id="${htmlFor}"`);
        }
      } else if (text && /^(mon|tue|wed|thu|fri|sat)$/i.test(text)) {
        console.log(`  -> Label has empty htmlFor, trying to find associated input by proximity or name`);
        // Try to find input by name or nearby
        const inputsByName = await page.locator(`input[name="${text.toLowerCase()}"]`).count();
        console.log(`  -> Found ${inputsByName} inputs with name="${text.toLowerCase()}"`);
      }
    }
    
    // Also check what's inside the wage calculator area by looking for container elements
    const wageCalcContainers = await page.locator('.wage-calculator, [class*="wage"], [id*="wage"]').all();
    console.log('\nPotential wage calculator containers:', wageCalcContainers.length);
    
    for (const container of wageCalcContainers) {
      const className = await container.evaluate(el => el.className);
      const id = await container.evaluate(el => el.id);
      const tagName = await container.evaluate(el => el.tagName);
      console.log(`Container: <${tagName} id="${id}" class="${className}">`);
      
      // Look for inputs inside this container
      const inputsInside = await container.locator('input').all();
      console.log(`  Inputs inside: ${inputsInside.length}`);
      
      for (const input of inputsInside) {
        const inputType = await input.evaluate(el => el.type);
        const inputName = await input.evaluate(el => el.name);
        const inputId = await input.evaluate(el => el.id);
        const inputValue = await input.evaluate(el => el.value);
        const inputChecked = await input.evaluate(el => el.checked);
        console.log(`    Input: type="${inputType}" name="${inputName}" id="${inputId}" value="${inputValue}" checked="${inputChecked}"`);
      }
    }
    
    // Take another screenshot
    await page.screenshot({
      path: 'test-results/wage-detailed-diagnostic.png',
      fullPage: true,
    });
    console.log('\nDetailed screenshot saved to test-results/wage-detailed-diagnostic.png');
  });
});