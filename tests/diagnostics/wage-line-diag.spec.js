const { test, expect } = require('@playwright/test');

test.describe('Wage Line Diagnostic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/', { waitUntil: 'networkidle' });
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });

  test('find wage line elements', async ({ page }) => {
    // Check for wage line elements
    const wageLine = await page.locator('#wage-line').count();
    console.log('wage-line count:', wageLine);
    
    const calcTotal = await page.locator('#calc-total').count();
    console.log('calc-total count:', calcTotal);
    if (calcTotal > 0) {
      console.log('calc-total text:', await page.locator('#calc-total').textContent());
    }
    
    const calcBreakdown = await page.locator('#calc-breakdown').count();
    console.log('calc-breakdown count:', calcBreakdown);
    if (calcBreakdown > 0) {
      console.log('calc-breakdown text:', await page.locator('#calc-breakdown').textContent());
    }
    
    // Check all elements with 'wage' in id
    const wageElements = await page.locator('[id*="wage"]').count();
    console.log('elements with wage in id:', wageElements);
    
    // Get all ids on the page
    const allIds = await page.evaluate(() => {
      const elements = document.querySelectorAll('[id]');
      return Array.from(elements).map(el => el.id).filter(id => id);
    });
    console.log('All IDs:', allIds);
  });
});