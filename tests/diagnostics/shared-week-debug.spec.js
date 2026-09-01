// tests/shared-week.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Shared Week State - Debug JavaScript', () => {
  test('should load invoice form without JavaScript errors', async ({ page }) => {
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`${msg.type()}: ${msg.text()}`);
        console.log(`BROWSER ERROR: ${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', err => {
      errors.push(`PAGE ERROR: ${err.message}`);
      console.log(`BROWSER PAGE ERROR: ${err.message}`);
    });

    // Login as administrator first
    await page.goto('/login');
    
    // Handle the login screen - select administrator option if present
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
    
    // Wait for login to complete (redirect to dashboard or invoices)
    await page.waitForTimeout(2000);
    
    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    await page.waitForTimeout(2000); // Wait for page to load
    
    // Check if we have any JavaScript errors
    if (errors.length > 0) {
      console.log('JavaScript errors detected:', errors);
      throw new Error(`JavaScript errors occurred: ${errors.join('; ')}`);
    }
    
    // Check if week_start is present
    const weekStartCount = await page.locator('#week_start').count();
    console.log(`Week start elements found: ${weekStartCount}`);
    
    if (weekStartCount > 0) {
      await page.fill('#week_start', '2026-08-24');
      await page.waitForTimeout(500);
      
      // Check for date inputs
      const monDateCount = await page.locator('#date_Mon').count();
      console.log(`Monday date input found: ${monDateCount > 0}`);
      
      if (monDateCount > 0) {
        const monDateValue = await page.inputValue('#date_Mon');
        console.log(`Monday date value: ${monDateValue}`);
      }
      
      // Check for calc elements
      const weekRangeCount = await page.locator('#calc-week-range').count();
      console.log(`Week range element found: ${weekRangeCount > 0}`);
      
      if (weekRangeCount > 0) {
        const weekRangeText = await page.textContent('#calc-week-range');
        console.log(`Week range text: ${weekRangeText}`);
      }
      
      // Check for days containers
      const calcDaysCount = await page.locator('#calc-days').count();
      const wageDaysCount = await page.locator('#wage-days').count();
      console.log(`Calc days container found: ${calcDaysCount > 0}`);
      console.log(`Wage days container found: ${wageDaysCount > 0}`);
      
      // Check for checkboxes
      const calcMonCount = await page.locator('#calc-days input[value="Mon"]').count();
      const wageMonCount = await page.locator('#wage-days input[value="Mon"]').count();
      console.log(`Calc Monday checkbox found: ${calcMonCount > 0}`);
      console.log(`Wage Monday checkbox found: ${wageMonCount > 0}`);
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/debug-invoice-form.png', fullPage: true });
    
    // Expect no JavaScript errors
    expect(errors).toHaveLength(0);
  });
});