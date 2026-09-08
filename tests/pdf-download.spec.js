const { test, expect } = require('@playwright/test');

test.describe('PDF Download - Real Browser Flow', () => {
test.beforeEach(async ({ page }) => {
    const errors = [];
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      errors.push(`PAGE ERROR: ${err.message}`);
    });

    page._jsErrors = errors;
    page._consoleMessages = consoleMessages;

    await page.addInitScript(() => {
      window._capturedBlobs = [];
      const origCreateObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function(blob) {
        window._capturedBlobs.push({
          blob,
          type: blob.type,
          size: blob.size
        });
        return origCreateObjectURL(blob);
      };

      window._capturedAnchors = [];
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        window._capturedAnchors.push({
          href: this.href,
          download: this.download,
          timestamp: Date.now()
        });
        return origClick.apply(this, arguments);
      };
    });

    await page.goto('/login');
    let loginFormVisible = false;
    try {
      await page.waitForSelector('form.stack:not(.login-admin-form)', { state: 'attached', timeout: 5000 });
      loginFormVisible = true;
    } catch (e) {
      // Login form not found, assume already logged in
    }

    if (loginFormVisible) {
      await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
      await page.fill('input[name="pin"]', '1234');
      await page.click('button:has-text("Sign in")');
      await page.waitForURL('**/', { waitUntil: 'networkidle' });
    }

    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 10000 });
  });

  async function getCapturedData(page) {
    const blobs = await page.evaluate(() => window._capturedBlobs || []);
    const anchors = await page.evaluate(() => window._capturedAnchors || []);
    return { blobs, anchors };
  }

  async function fillInvoiceForm(page, options = {}) {
    const {
      weekStart = '2026-08-24',
      days = ['Mon', 'Wed', 'Sat'],
      template = 'asg',
      customerName = 'PDF Test Customer',
      customerAddress = '123 Test Street',
      notes = 'Test notes',
      gst = false
    } = options;

    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 10000 });
    await page.waitForSelector('#calc-days-standard .calc-day input[data-day="Mon"]', { state: 'visible', timeout: 10000 });

    // Uncheck all days first
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of allDays) {
      const calcDayLabel = page.locator(`#calc-days-standard .calc-day:has(input[data-day="${day}"]), #calc-days-sat .calc-day:has(input[data-day="${day}"])`);
      const calcDayInput = calcDayLabel.locator('input');
      if (await calcDayInput.isChecked()) {
        await calcDayLabel.click();
      }
      await expect(calcDayInput).not.toBeChecked();
    }

    await page.fill('#week_start', weekStart);
    await page.waitForTimeout(100);

    // Select specified days
    for (const day of days) {
      const selector = day === 'Sat' 
        ? `#calc-days-sat .calc-day:has(input[data-day="${day}"])`
        : `#calc-days-standard .calc-day:has(input[data-day="${day}"])`;
      await page.locator(selector).click();
    }
    await page.waitForTimeout(100);

    if (template) {
      await page.locator(`.tpl[data-template="${template}"]`).click();
      await page.waitForTimeout(100);
    }

    await page.fill('#customer_name', customerName);
    await page.fill('#customer_address', customerAddress);
    await page.fill('#notes', notes);
    
    if (gst) {
      await page.locator('#gst').check();
    }

    await page.click('#calc-add');
    await page.waitForTimeout(500);

    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 5000 });

    return { gst };
  }

  async function downloadPDF(page) {
    const pdfResponsePromise = page.waitForResponse(response => 
      response.url().includes('/api/invoices') && 
      response.request().method() === 'POST' &&
      response.request().postData().includes('"action":"download"')
    );

    await page.click('#submit-download');
    return await pdfResponsePromise;
  }

  test('Download PDF button - real XHR flow with browser instrumentation', async ({ page }) => {
    await fillInvoiceForm(page, {
      customerName: 'XHR PDF Test Customer',
      customerAddress: '123 XHR Street',
      notes: 'Test notes for XHR PDF',
      gst: true
    });

    const pdfResponse = await downloadPDF(page);
    expect(pdfResponse.status()).toBe(200);

    const headers = pdfResponse.headers();
    expect(headers['content-type']).toContain('application/pdf');

    const contentDisposition = headers['content-disposition'];
    expect(contentDisposition).toContain('Contractor Invoice');
    expect(contentDisposition).toContain('.pdf"');

    const pdfBuffer = await pdfResponse.body();
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.slice(0,5).toString()).toBe('%PDF-');

    const { blobs, anchors } = await getCapturedData(page);
    
    expect(blobs.length).toBeGreaterThan(0);
    const pdfBlob = blobs[0];
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(1000);

    expect(anchors.length).toBeGreaterThan(0);
    const anchor = anchors[0];
    expect(anchor.download).toMatch(/Contractor Invoice.*\.pdf/);
    expect(anchor.href).toContain('blob:');

    const { PDFParse } = require('pdf-parse');
    const pdfData = await new PDFParse({ data: pdfBuffer }).getText();
    const text = pdfData.text;

    console.log('PDF Text (first 1500 chars):', text.substring(0, 1500));

    expect(text).toContain('AMPLIFY SOLUTIONS GROUP PTY LTD');
    expect(text).toContain('43 663 126 725');
    expect(text).toContain('14C, 1 The Esplanade');
    expect(text).toContain('Natalie@sjssolutionscorp.com.au');
    
    // PDF should contain the template company name (ASG) in BILL TO section
    expect(text).toContain('AMPLIFY SOLUTIONS GROUP PTY LTD');
    expect(text).toContain('14C, 1 The Esplanade');
    expect(text).toContain('Test notes for XHR PDF');
    
    expect(text).toContain('Wages/Retainer');
    expect(text).toContain('Mon — 24th');
    expect(text).toContain('Wed — 26th');
    expect(text).toContain('Sat — 29th');
    expect(text).toContain('½');
    
    expect(text).toContain('Subtotal');
    expect(text).toContain('GST');
    expect(text).toContain('TOTAL');

    const errorAlert = page.locator('.alert-error, .error-message, [role="alert"]');
    await expect(errorAlert).not.toBeVisible();
  });

  test('Download PDF twice - no duplicate invoices', async ({ page }) => {
        await fillInvoiceForm(page, {
          customerName: 'Duplicate XHR Test Customer',
          customerAddress: '123 Duplicate XHR Street',
          gst: true
        });

        await Promise.all([
          page.waitForURL(/\/invoices\/\d+/),
          page.click('#submit-draft'),
        ]);
        await expect(page).toHaveURL(/\/invoices\/\d+/);

        const url = new URL(page.url());
        const pathname = url.pathname;
        const invoiceId = pathname.split('/')[2];

        const firstResponse = await page.request.get(`/invoices/${invoiceId}/download`);
        expect(firstResponse.status()).toBe(200);
        const firstBuffer = await firstResponse.body();
        expect(firstBuffer.length).toBeGreaterThan(1000);
        expect(firstBuffer.slice(0, 5).toString()).toBe('%PDF-');

        const firstDisp = firstResponse.headers()['content-disposition'];
        expect(firstDisp).toContain('Contractor Invoice');

        const secondResponse = await page.request.get(`/invoices/${invoiceId}/download`);
        expect(secondResponse.status()).toBe(200);
        const secondBuffer = await secondResponse.body();
        expect(secondBuffer.length).toBeGreaterThan(1000);
        expect(secondBuffer.slice(0, 5).toString()).toBe('%PDF-');

        const secondDisp = secondResponse.headers()['content-disposition'];
        expect(firstDisp).toBe(secondDisp);

        const { PDFParse } = require('pdf-parse');
        const firstData = await new PDFParse({ data: firstBuffer }).getText();
        const secondData = await new PDFParse({ data: secondBuffer }).getText();
        // PDF should contain the template company name (ASG) in BILL TO section
        expect(firstData.text).toContain('AMPLIFY SOLUTIONS GROUP PTY LTD');
        expect(secondData.text).toContain('AMPLIFY SOLUTIONS GROUP PTY LTD');
      });

  test('ASG Bill To - verify company details in form and PDF', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 10000 });

    await page.locator('.tpl[data-template="asg"]').click();
    await page.waitForTimeout(100);

    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('14C, 1 The Esplanade, Mount pleasant, 6153');

    await page.waitForSelector('#calc-days-standard .calc-day input[data-day="Mon"]', { state: 'visible' });
    await page.fill('#week_start', '2026-08-24');
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Mon"])').click();
    await page.fill('#customer_name', 'ASG Test Customer');
    await page.click('#calc-add');
    await page.waitForTimeout(500);

    const pdfResponse = await downloadPDF(page);
    const pdfBuffer = await pdfResponse.body();
    const { PDFParse } = require('pdf-parse');
    const pdfData = await new PDFParse({ data: pdfBuffer }).getText();
    const text = pdfData.text;

    expect(text).toContain('AMPLIFY SOLUTIONS GROUP PTY LTD');
    expect(text).toContain('43 663 126 725');
    expect(text).toContain('14C, 1 The Esplanade');
    expect(text).toContain('Natalie@sjssolutionscorp.com.au');
  });

  test('SJS Bill To - verify company details in form and PDF', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 10000 });

    await page.locator('.tpl[data-template="sjs"]').click();
    await page.waitForTimeout(100);

    await expect(page.locator('#customer_name')).toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('PO Box 3330, Beeliar Drive, Success WA 6964');

    await expect(page.locator('#customer_name')).not.toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');

    await page.waitForSelector('#calc-days-standard .calc-day input[data-day="Mon"]', { state: 'visible' });
    await page.fill('#week_start', '2026-08-24');
    await page.locator('#calc-days-standard .calc-day:has(input[data-day="Mon"])').click();
    await page.fill('#customer_name', 'SJS Test Customer');
    await page.click('#calc-add');
    await page.waitForTimeout(500);

    const pdfResponse = await downloadPDF(page);
    const pdfBuffer = await pdfResponse.body();
    const { PDFParse } = require('pdf-parse');
    const pdfData = await new PDFParse({ data: pdfBuffer }).getText();
    const text = pdfData.text;

    expect(text).toContain('SJS WEALTH SOLUTIONS PTY LTD');
    expect(text).toContain('89 622 469 845');
    expect(text).toContain('PO Box 3330, Beeliar Drive, Success WA 6964');
    expect(text).toContain('Natalie@sjssolutionscorp.com.au');

    expect(text).not.toContain('AMPLIFY SOLUTIONS GROUP PTY LTD');
    expect(text).not.toContain('43 663 126 725');
  });

  test('Switch ASG -> SJS -> ASG - no stale values in form fields', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 10000 });

    await page.locator('.tpl[data-template="asg"]').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('14C, 1 The Esplanade, Mount pleasant, 6153');
    await expect(page.locator('#customer_name')).not.toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');

    await page.locator('.tpl[data-template="sjs"]').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#customer_name')).toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('PO Box 3330, Beeliar Drive, Success WA 6964');
    await expect(page.locator('#customer_name')).not.toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_address')).not.toHaveValue('14C, 1 The Esplanade, Mount pleasant, 6153');

    await page.locator('.tpl[data-template="asg"]').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('14C, 1 The Esplanade, Mount pleasant, 6153');
    await expect(page.locator('#customer_name')).not.toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');
    await expect(page.locator('#customer_address')).not.toHaveValue('PO Box 3330, Beeliar Drive, Success WA 6964');
  });

  test('PDF filename format is correct', async ({ page }) => {
    await fillInvoiceForm(page, {
      customerName: 'Filename Test Customer',
      customerAddress: '123 Filename Street',
      notes: 'Test filename'
    });

    const pdfResponse = await downloadPDF(page);
    const contentDisposition = pdfResponse.headers()['content-disposition'];
    
    // Expected format: Contractor Invoice - Rep Name - DD-MM-YYYY - $Amount.pdf
    expect(contentDisposition).toMatch(/Contractor Invoice - .* - \d{2}-\d{2}-\d{4} - \$[\d,]+\.\d{2}\.pdf/);
  });
});
