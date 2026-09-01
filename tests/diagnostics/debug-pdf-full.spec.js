const { test, expect } = require('@playwright/test');

test.describe('Debug PDF Content - Full', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached' });
    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/', { waitUntil: 'networkidle' });
  });

  test('Debug PDF content - check for company details', async ({ page }) => {
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
    await page.fill('#notes', 'Test notes');

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
    
    // Check if it's a valid PDF
    const isPdf = pdfBuffer.slice(0, 4).toString() === '%PDF';
    console.log('Is valid PDF:', isPdf);
    
    // Try to extract text using pdf-parse with correct API
    const { PDFParse } = require('pdf-parse');
    try {
      const pdfParser = new PDFParse({ data: pdfBuffer });
      const pdfData = await pdfParser.getText();
      const text = pdfData.text;
      console.log('Extracted text length:', text.length);
      console.log('Extracted text (first 1000 chars):', JSON.stringify(text.substring(0, 1000)));
      console.log('Extracted text (last 1000 chars):', JSON.stringify(text.slice(-1000)));
      console.log('Full extracted text:', JSON.stringify(text));
      
      // Check for expected content
      console.log('\\n=== CHECKING FOR EXPECTED CONTENT ===');
      console.log('Contains AMPLIFY SOLUTIONS GROUP PTY LTD:', text.includes('AMPLIFY SOLUTIONS GROUP PTY LTD'));
      console.log('Contains 43 663 126 725:', text.includes('43 663 126 725'));
      console.log('Contains 14C, 1 The Esplanade:', text.includes('14C, 1 The Esplanade'));
      console.log('Contains Natalie@sjssolutionscorp.com.au:', text.includes('Natalie@sjssolutionscorp.com.au'));
      console.log('Contains Debug Test Customer:', text.includes('Debug Test Customer'));
      console.log('Contains 123 Debug Street:', text.includes('123 Debug Street'));
      console.log('Contains Test notes:', text.includes('Test notes'));
      console.log('Contains Wages/Retainer:', text.includes('Wages/Retainer'));
      console.log('Contains Mon — 24th:', text.includes('Mon — 24th'));
      
    } catch (error) {
      console.error('Error extracting text:', error.message);
    }
  });
});