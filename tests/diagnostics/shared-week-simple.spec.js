// tests/shared-week.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Shared Week State - Simple Login Test', () => {
  test('should be able to login and reach invoices/new', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/login-page.png' });
    
    // Check if we need to click administrator option
    const adminLabel = page.locator('p:has-text("Administrator")');
    if (await adminLabel.count() > 0) {
      await adminLabel.first().click();
      await page.waitForTimeout(500);
    }
    
    // Fill in the admin login form
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'changeme');
    
    // Click the admin sign in button
    await page.click('button:has-text("Admin sign in")');
    
    // Wait for a bit to see where we go
    await page.waitForTimeout(3000);
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'test-results/after-login-attempt.png' });
    
    console.log('Current URL after login attempt:', page.url());
    
    // If we're not on invoices/new, try to go there directly
    if (!page.url().includes('/invoices/new')) {
      await page.goto('/invoices/new');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/after-direct-nav.png' });
      console.log('URL after direct nav to invoices/new:', page.url());
    }
    
    // Now check if we can find the week_start element
    const weekStart = page.locator('#week_start');
    console.log('Number of week_start elements found:', await weekStart.count());
    
    if (await weekStart.count() > 0) {
      console.log('Found week_start element!');
      await weekStart.fill('2026-08-24');
      await page.screenshot({ path: 'test-results/after-filling-week-start.png' });
    } else {
      console.log('Could not find week_start element');
      // Show all inputs on the page
      const inputs = await page.locator('input').all();
      console.log('Found', inputs.length, 'total input elements');
      for (let i = 0; i < inputs.length; i++) {
        const id = await inputs[i].getAttribute('id');
        const name = await inputs[i].getAttribute('name');
        const type = await inputs[i].getAttribute('type');
        console.log(`  Input ${i}: id="${id}", name="${name}", type="${type}"`);
      }
      
      // Show the page title and some body content
      const title = await page.title();
      console.log('Page title:', title);
      
      const bodyText = await page.locator('body').innerText();
      console.log('Body text (first 500 chars):', bodyText.substring(0, 500));
    }
  });
});