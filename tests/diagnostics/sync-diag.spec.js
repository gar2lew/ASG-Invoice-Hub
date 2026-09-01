const { test, expect } = require('@playwright/test');

test.describe('Sync Diagnostic', () => {
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

  test('debug sync between widgets', async ({ page }) => {
    // Reset all to unchecked
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      await page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`).click();
    }
    await page.waitForTimeout(100);
    
    console.log('After reset - all should be unchecked');
    
    // Check Tue in calc-days
    await page.locator('#calc-days .calc-day:has(input[data-day="Tue"])').click();
    await page.waitForTimeout(100);
    
    const tueCalc = await page.locator('#calc-days input[data-day="Tue"]').isChecked();
    const tueWage = await page.locator('#wage-days input[name="wage_day"][data-day="Tue"]').isChecked();
    console.log('After clicking Tue label in calc-days - calc:', tueCalc, 'wage:', tueWage);
    
    // Also try clicking the checkbox directly with force
    await page.locator('#calc-days input[data-day="Wed"]').check({ force: true });
    await page.waitForTimeout(100);
    
    const wedCalc = await page.locator('#calc-days input[data-day="Wed"]').isChecked();
    const wedWage = await page.locator('#wage-days input[name="wage_day"][data-day="Wed"]').isChecked();
    console.log('After force check Wed in calc-days - calc:', wedCalc, 'wage:', wedWage);
  });
});