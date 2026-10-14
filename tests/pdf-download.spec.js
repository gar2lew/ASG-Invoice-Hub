const { test, expect } = require('@playwright/test');

test.describe('PDF Download - Saved Invoice Flow', () => {
test.beforeEach(async ({ page }) => {
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
    await page.waitForSelector('.weekdays .day-btn[data-state="off"]', { state: 'visible', timeout: 10000 });

    // Clear all days first by clicking "Off" for each day
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of allDays) {
      const sel = day === 'Sat'
        ? '.saturday-controls .day-btn[data-state="off"]'
        : `.weekday[data-day="${day}"] .day-btn[data-state="off"]`;
      const offBtn = page.locator(sel);
      await offBtn.click();
    }

    await page.fill('#week_start', weekStart);
    await page.waitForTimeout(100);

    // Select specified days (weekdays = full, Saturday = half)
    for (const day of days) {
      const state = day === 'Sat' ? 'half' : 'full';
      const selector = day === 'Sat'
        ? `.saturday-controls .day-btn[data-state="${state}"]`
        : `.weekday[data-day="${day}"] .day-btn[data-state="${state}"]`;
      await page.locator(selector).click();
    }
    await page.waitForTimeout(100);

    if (template) {
      await page.locator(`.company-option[data-template="${template}"]`).click();
      await page.waitForTimeout(100);
    }

    await page.fill('#customer_name', customerName);
    await page.fill('#customer_address', customerAddress);
    await page.fill('#notes', notes);

    if (gst) {
      await page.locator('#gst').check();
    }

    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    await expect(wageRow).toBeVisible({ timeout: 5000 });

    return { gst };
  }

  async function downloadSavedInvoice(page) {
    await page.click('#submit-draft');
    await expect(page).toHaveURL(/\/invoices\/\d+/);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href$="/download"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/Contractor Invoice.*\.pdf/);
    return require('fs').readFileSync(await download.path());
  }

  test('Saved invoice PDF preserves customer and wage details', async ({ page }) => {
    await fillInvoiceForm(page, {
      customerName: 'XHR PDF Test Customer',
      customerAddress: '123 XHR Street',
      notes: 'Test notes for XHR PDF',
      gst: true
    });

    const pdfBuffer = await downloadSavedInvoice(page);
    expect(pdfBuffer.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    const { PDFParse } = require('pdf-parse');
    const pdfData = await new PDFParse({ data: pdfBuffer }).getText();
    const text = pdfData.text;
    expect(text).toContain('Wages/Retainer');
    expect(text).toContain('Mon - 24/08/2026');
    expect(text).toContain('Wed - 26/08/2026');
    expect(text).toContain('Sat - 29/08/2026');
    expect(text).toContain('166.67');
    expect(text).toContain('83.33');
  });

  test('Download saved PDF twice - invoice remains available', async ({ page }) => {
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

    await page.locator('.company-option[data-template="asg"]').click();
    await page.waitForTimeout(100);
    if (!(await page.locator('.invoice-more-options').evaluate((el) => el.open))) await page.locator('.invoice-more-options summary').click();

    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('4/58 Kishorn Road, Mount Pleasant WA 6153');

    await page.waitForSelector('.weekdays .day-btn[data-state="off"]', { state: 'visible' });
    await page.fill('#week_start', '2026-08-24');
    await page.locator('.weekday[data-day="Mon"] .day-btn[data-state="full"]').click();
    await page.fill('#customer_name', 'ASG Test Customer');
    await page.waitForTimeout(500);

    const pdfBuffer = await downloadSavedInvoice(page);
    const { PDFParse } = require('pdf-parse');
    const pdfData = await new PDFParse({ data: pdfBuffer }).getText();
    const text = pdfData.text;

    expect(text).toContain('AMPLIFY SOLUTIONS GROUP PTY LTD');
    expect(text).toContain('43 663 126 725');
    expect(text).toContain('4/58 Kishorn Road');
    expect(text).toContain('Natalie@sjssolutionscorp.com.au');
  });

  test('SJS Bill To - verify company details in form and PDF', async ({ page }) => {
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 10000 });

    await page.locator('.company-option[data-template="sjs"]').click();
    await page.waitForTimeout(100);
    if (!(await page.locator('.invoice-more-options').evaluate((el) => el.open))) await page.locator('.invoice-more-options summary').click();

    await expect(page.locator('#customer_name')).toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('PO Box 3330, Beeliar Drive, Success WA 6964');

    await expect(page.locator('#customer_name')).not.toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');

    await page.waitForSelector('.weekdays .day-btn[data-state="off"]', { state: 'visible' });
    await page.fill('#week_start', '2026-08-24');
    await page.locator('.weekday[data-day="Mon"] .day-btn[data-state="full"]').click();
    await page.fill('#customer_name', 'SJS Test Customer');
    await page.waitForTimeout(500);

    const pdfBuffer = await downloadSavedInvoice(page);
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

    await page.locator('.company-option[data-template="asg"]').click();
    await page.waitForTimeout(100);
    if (!(await page.locator('.invoice-more-options').evaluate((el) => el.open))) await page.locator('.invoice-more-options summary').click();
    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('4/58 Kishorn Road, Mount Pleasant WA 6153');
    await expect(page.locator('#customer_name')).not.toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');

    await page.locator('.company-option[data-template="sjs"]').click();
    await page.waitForTimeout(100);
    if (!(await page.locator('.invoice-more-options').evaluate((el) => el.open))) await page.locator('.invoice-more-options summary').click();
    await expect(page.locator('#customer_name')).toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('PO Box 3330, Beeliar Drive, Success WA 6964');
    await expect(page.locator('#customer_name')).not.toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_address')).not.toHaveValue('4/58 Kishorn Road, Mount Pleasant WA 6153');

    await page.locator('.company-option[data-template="asg"]').click();
    await page.waitForTimeout(100);
    if (!(await page.locator('.invoice-more-options').evaluate((el) => el.open))) await page.locator('.invoice-more-options summary').click();
    await expect(page.locator('#customer_name')).toHaveValue('AMPLIFY SOLUTIONS GROUP PTY LTD');
    await expect(page.locator('#customer_email')).toHaveValue('Natalie@sjssolutionscorp.com.au');
    await expect(page.locator('#customer_address')).toHaveValue('4/58 Kishorn Road, Mount Pleasant WA 6153');
    await expect(page.locator('#customer_name')).not.toHaveValue('SJS WEALTH SOLUTIONS PTY LTD');
    await expect(page.locator('#customer_address')).not.toHaveValue('PO Box 3330, Beeliar Drive, Success WA 6964');
  });

  test('PDF filename format is correct', async ({ page }) => {
    await fillInvoiceForm(page, {
      customerName: 'Filename Test Customer',
      customerAddress: '123 Filename Street',
      notes: 'Test filename'
    });

    await page.click('#submit-draft');
    await expect(page).toHaveURL(/\/invoices\/\d+/);
    const filename = await page.locator('a[href$="/download"]').getAttribute('href');
    const response = await page.request.get(filename);
    const contentDisposition = response.headers()['content-disposition'];

    // Expected format: Contractor Invoice - Rep Name - DD-MM-YYYY - $Amount.pdf
    expect(contentDisposition).toMatch(/Contractor Invoice - .* - \d{2}-\d{2}-\d{4} - \$[\d,]+\.\d{2}\.pdf/);
  });
});
