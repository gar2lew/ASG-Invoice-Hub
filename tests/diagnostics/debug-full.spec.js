const { test, expect } = require('@playwright/test');

test.describe('Sync and Calc-Add Diagnostic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    await page.selectOption('select[name="user_id"]', '2');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/');
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });

  test('debug sync with both widgets', async ({ page }) => {
    // Reset all to unchecked
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      await page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`).click();
    }
    await page.waitForTimeout(100);
    
    console.log('=== After reset ===');
    for (const day of days) {
      const calc = await page.locator(`#calc-days input[data-day="${day}"]`).isChecked();
      const wage = await page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]`).isChecked();
      console.log(`${day}: calc=${calc}, wage=${wage}`);
    }
    
    // Check Tue in calc-days
    await page.locator('#calc-days .calc-day:has(input[data-day="Tue"])').click();
    await page.waitForTimeout(100);
    
    console.log('=== After clicking Tue label in calc-days ===');
    for (const day of ['Tue', 'Thu']) {
      const calc = await page.locator(`#calc-days input[data-day="${day}"]`).isChecked();
      const wage = await page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]`).isChecked();
      console.log(`${day}: calc=${calc}, wage=${wage}`);
    }
    
    // Check Thu in calc-days
    await page.locator('#calc-days .calc-day:has(input[data-day="Thu"])').click();
    await page.waitForTimeout(100);
    
    console.log('=== After clicking Thu label in calc-days ===');
    for (const day of ['Tue', 'Thu']) {
      const calc = await page.locator(`#calc-days input[data-day="${day}"]`).isChecked();
      const wage = await page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]`).isChecked();
      console.log(`${day}: calc=${calc}, wage=${wage}`);
    }
    
    // Now check Tue in wage-days
    await page.locator('#wage-days input[name="wage_day"][data-day="Tue"]').click();
    await page.waitForTimeout(100);
    
    console.log('=== After clicking Tue checkbox in wage-days ===');
    for (const day of ['Tue', 'Thu']) {
      const calc = await page.locator(`#calc-days input[data-day="${day}"]`).isChecked();
      const wage = await page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]`).isChecked();
      console.log(`${day}: calc=${calc}, wage=${wage}`);
    }
    
    // Now check Thu in wage-days
    await page.locator('#wage-days input[name="wage_day"][data-day="Thu"]').click();
    await page.waitForTimeout(100);
    
    console.log('=== After clicking Thu checkbox in wage-days ===');
    for (const day of ['Tue', 'Thu']) {
      const calc = await page.locator(`#calc-days input[data-day="${day}"]`).isChecked();
      const wage = await page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]`).isChecked();
      console.log(`${day}: calc=${calc}, wage=${wage}`);
    }
  });

  test('debug calc-add button', async ({ page }) => {
    // Reset all to unchecked
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      await page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`).click();
    }
    await page.waitForTimeout(100);
    
    // Check Mon, Wed, Fri
    await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Wed"])').click();
    await page.locator('#calc-days .calc-day:has(input[data-day="Fri"])').click();
    await page.waitForTimeout(100);
    
    console.log('=== Before calc-add ===');
    const linesBefore = await page.locator('#lines .line-row:not(.line-head)').count();
    console.log('Line rows before:', linesBefore);
    
    // Check calc-total
    const calcTotal = await page.locator('#calc-total').textContent();
    console.log('calc-total:', calcTotal);
    
    // Click calc-add
    await page.click('#calc-add');
    await page.waitForTimeout(100);
    
    console.log('=== After calc-add ===');
    const linesAfter = await page.locator('#lines .line-row:not(.line-head)').count();
    console.log('Line rows after:', linesAfter);
    
    if (linesAfter > 0) {
      const itemDesc = await page.locator('#lines input[name="item_description"]').first().inputValue();
      const itemQty = await page.locator('#lines input[name="item_qty"]').first().inputValue();
      const itemRate = await page.locator('#lines input[name="item_rate"]').first().inputValue();
      console.log('First line:', itemDesc, itemQty, itemRate);
    }
  });
});