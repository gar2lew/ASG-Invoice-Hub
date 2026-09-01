const { test, expect } = require('@playwright/test');

test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Rep Login Test', () => {
  test('rep can log in and access invoice page', async ({ page }) => {
    // Go to the invoice page
    await page.goto('/invoices/new');
    // Wait for the invoice form to be visible
    await expect(page.locator('#invoice-form')).toBeVisible();
    // Wait for the week_start input to be visible
    const weekStartVisible = await page.locator('#week_start').isVisible();
    expect(weekStartVisible).toBeTruthy();
  });
});