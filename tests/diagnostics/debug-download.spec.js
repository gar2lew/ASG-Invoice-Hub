const { test, expect } = require('@playwright/test');

test.describe('Debug PDF Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/', { waitUntil: 'networkidle' });
  });

  test('Debug form submit and XHR - check response', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 10000 });
    await page.waitForSelector('#calc-days .calc-day input[data-day="Mon"]', { state: 'visible', timeout: 10000 });

    // Uncheck all
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of allDays) {
      const calcDayLabel = page.locator(`#calc-days .calc-day:has(input[data-day="${day}"])`);
      const calcDayInput = calcDayLabel.locator('input');
      if (await calcDayInput.isChecked()) {
        await calcDayLabel.click();
      }
    }

    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();
    await page.waitForTimeout(100);

    await page.fill('#customer_name', 'Debug Test Customer');
    await page.fill('#customer_address', '123 Debug Street');

    await page.click('#calc-add');
    await page.waitForTimeout(1000);

    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 5000 });

    // Wait for the response
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/invoices') && response.request().method() === 'POST'
    );

    console.log('Clicking download...');
    await page.click('#submit-download');
    
    const response = await responsePromise;
    console.log('Response status:', response.status());
    console.log('Response headers:', response.headers());
    console.log('Response url:', response.url());
    
    const body = await response.body();
    console.log('Response body length:', body.length);
    console.log('Response body header:', body.slice(0, 100).toString());
    console.log('Full body:', body.toString());
  });
});