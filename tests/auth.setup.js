const { test, expect } = require('@playwright/test');

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('E2E Authentication Setup', () => {
  test('login as e2e rep and save storage state', async ({ page, context }) => {
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    // Wait for rep options to populate (getReps filters is_active = TRUE)
    await page.waitForSelector('select[name="user_id"] option:nth-child(2)', { state: 'attached', timeout: 10000 });

    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name=\"pin\"]', '1234');
    await page.click('button:has-text(\"Sign in\")');

    // Wait a moment for the form submission
    await page.waitForTimeout(2000);

    // Check current URL - should be on dashboard now
    console.log('Current URL after login:', page.url());
    const isDashboard = page.url().includes('/') && !page.url().includes('/login');
    console.log('Is dashboard:', isDashboard);

    // Verify we're on dashboard (not login)
    expect(isDashboard).toBeTruthy();

    // Save storage state
    await context.storageState({ path: 'e2e-storage-state.json' });
  });
});