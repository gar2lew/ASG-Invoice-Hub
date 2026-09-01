const { test, expect } = require('@playwright/test');

test('demo', async ({ page }) => {
  await page.goto('https://example.com');
  expect(await page.title()).toBe('Example Domain');
});