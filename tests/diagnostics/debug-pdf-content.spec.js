const { test, expect } = require('@playwright/test');

test.describe('Debug PDF Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/', { waitUntil: 'networkidle' });
  });

  test('Debug PDF content inspection', async ({ page }) => {
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

    // Wait for the response
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/invoices') && response.request().method() === 'POST'
    );

    await page.click('#submit-download');
    const response = await responsePromise;
    
    const pdfBuffer = await response.body();
    console.log('PDF Buffer length:', pdfBuffer.length);
    console.log('PDF Buffer first 50 bytes:', pdfBuffer.slice(0, 50));
    console.log('PDF Buffer as string (first 200 chars):', pdfBuffer.slice(0, 200).toString());
    
    // Check if it's a valid PDF
    const isPdf = pdfBuffer.slice(0, 4).toString() === '%PDF';
    console.log('Is valid PDF:', isPdf);
    
    // Try to extract text using pdf-parse with correct API
    const { PDFParse } = require('pdf-parse');
    try {
      const pdfParser = new PDFParse({ data: pdfBuffer });
      const pdfData = await pdfParser.getText();
      console.log('Extracted text length:', pdfData.text.length);
      console.log('Extracted text (first 500 chars):', JSON.stringify(pdfData.text.substring(0, 500)));
      console.log('Extracted text (full):', JSON.stringify(pdfData.text));
    } catch (error) {
      console.error('Error extracting text:', error.message);
    }
  });
});