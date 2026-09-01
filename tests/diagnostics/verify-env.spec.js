const { test, expect } = require('@playwright/test');

test('basic test', async ({ page }) => {
  await page.goto('https://example.com');
  expect(await page.title()).toBe('Example Domain');
});