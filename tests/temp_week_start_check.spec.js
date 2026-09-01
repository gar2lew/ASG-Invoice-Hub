const { test, expect } = require('@playwright/test');

test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Week start field check', () => {
  test('check week_start field after navigation', async ({ page }) => {
    await page.goto('/invoices/new');
    console.log('URL after goto:', page.url());
    const formCount = await page.locator('form#invoice-form').count();
    console.log('Invoice form count:', formCount);
    const weekStartCount = await page.locator('#week_start').count();
    console.log('Week start count:', weekStartCount);
    if (weekStartCount > 0) {
      const weekStartVisible = await page.locator('#week_start').isVisible();
      console.log('Week start visible:', weekStartVisible);
      const weekStartEnabled = await page.locator('#week_start').isEnabled();
      console.log('Week start enabled:', weekStartEnabled);
      await page.locator('#week_start').fill('2026-08-24');
      console.log('Filled week_start');
      const weekStartValue = await page.locator('#week_start').inputValue();
      console.log('Week start value:', weekStartValue);
    } else {
      console.log('Week start field not found');
    }
  });
});