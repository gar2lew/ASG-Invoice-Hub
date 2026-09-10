const { test, expect } = require('@playwright/test');

test.describe('SJS End-to-End Flow', () => {
  // Tests use storageState from auth.setup.js — already authenticated as rep

  test('rep logs in and creates SJS invoice', async ({ page }) => {
    await page.goto('/invoices/new');
    
    // Switch to SJS template
    await page.click('.tpl[data-template="sjs"]');
    
    // Verify SJS company details appear
    await expect(page.locator('#customer_name')).toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');
    
    // Add line item
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Consulting');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    
    // Save draft
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);
  });

  test('SJS invoice Mon-Fri wage calculation = $900', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="sjs"]');
    
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '5');
    await page.fill('[name="item_rate"]', '180');
    
    // Expected total: 5 * 180 = 900
    await expect(page.locator('#t-total')).toContainText('$900');
  });

  test('SJS invoice Mon-Sat wage calculation = $1000', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="sjs"]');
    
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '5');
    await page.fill('[name="item_rate"]', '180');
    
    await expect(page.locator('#t-total')).toContainText('$900');
  });

  test('SJS invoice save draft and reload', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="sjs"]');
    await page.fill('#customer_name', 'SJS Reload Test');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);
    
    const invoiceUrl = page.url();
    
    // Reload
    await page.goto(invoiceUrl);
    await expect(page.locator('.dl').first()).toContainText('SJS Reload Test');
  });

  test('SJS PDF generation with correct BILL TO', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="sjs"]');
    await page.fill('#customer_name', 'SJS PDF BILL TO Test');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="/download"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/Contractor Invoice.*\.pdf/);
  });

  test('SJS template does not contaminate ASG', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="sjs"]');
    await page.fill('#customer_name', 'SJS Customer');
    await page.click('#add-line');
    await page.fill('[name="item_description"]', 'SJS Service');
    await page.fill('[name="item_qty"]', '1');
    await page.fill('[name="item_rate"]', '200');
    await page.click('[data-action="save"]');
    await expect(page).toHaveURL(/\/invoices\/\d+/);
    
    // Create ASG invoice - should have ASG company name
    await page.goto('/invoices/new');
    await page.click('.tpl[data-template="asg"]');
    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
  });
});
