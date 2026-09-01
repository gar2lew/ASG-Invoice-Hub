const { test, expect } = require('@playwright/test');

test.describe('DOM Diagnostic', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for JavaScript errors and console messages
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      errors.push(`PAGE ERROR: ${err.message}`);
    });
    page._jsErrors = errors;

    // Login as rep first (Chloe Boyle with PIN 1234)
    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    await page.selectOption('select[name="user_id"]', '2');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/');
    
    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });

  test('inspect DOM elements', async ({ page }) => {
    console.log('URL:', page.url());
    console.log('TITLE:', await page.title());
    
    // Check week elements
    const weekStartInput = await page.locator('#week_start').inputValue();
    console.log('week_start value:', weekStartInput);
    
    const calcWeekRange = await page.locator('#calc-week-range').textContent();
    console.log('calc-week-range text:', calcWeekRange);
    
    // Check wage calculator checkboxes
    const calcDaysCount = await page.locator('#calc-days .calc-day').count();
    console.log('calc-day labels count:', calcDaysCount);
    
    const calcCheckboxes = await page.locator('#calc-days input[data-day]').count();
    console.log('calc-days checkboxes count:', calcCheckboxes);
    
    // Check wage-days checkboxes
    const wageDaysCount = await page.locator('#wage-days .wage-day').count();
    console.log('wage-day labels count:', wageDaysCount);
    
    const wageCheckboxes = await page.locator('#wage-days input[name="wage_day"]').count();
    console.log('wage-days checkboxes count:', wageCheckboxes);
    
    // Check line items area
    const linesContainer = await page.locator('#lines');
    console.log('lines container exists:', await linesContainer.count());
    
    const addLineBtn = await page.locator('#add-line');
    console.log('add-line button exists:', await addLineBtn.count());
    console.log('add-line button visible:', await addLineBtn.isVisible());
    
    // Check if there are any existing line rows
    const lineRows = await page.locator('#lines .line-row').count();
    console.log('existing line rows:', lineRows);
    
    // Check the item description input
    const itemDesc = await page.locator('#item_description');
    console.log('item_description exists:', await itemDesc.count());
    console.log('item_description visible:', await itemDesc.isVisible().catch(() => false));
    
    // Get full HTML of lines container
    const linesHTML = await page.locator('#lines').evaluate(el => el.outerHTML);
    console.log('lines container HTML:', linesHTML);
    
    // Check calc-add button
    const calcAdd = await page.locator('#calc-add');
    console.log('calc-add exists:', await calcAdd.count());
    console.log('calc-add visible:', await calcAdd.isVisible());
    
    // Check wage-days inputs
    const monWageCheckbox = await page.locator('#wage-days input[name="wage_day"][data-day="Mon"]');
    console.log('Mon wage checkbox exists:', await monWageCheckbox.count());
    console.log('Mon wage checkbox visible:', await monWageCheckbox.isVisible());
    
    // Take screenshot for manual inspection
    await page.screenshot({
      path: 'test-results/dom-diagnostic.png',
      fullPage: true,
    });
  });
});