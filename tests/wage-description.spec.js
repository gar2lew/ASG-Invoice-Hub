const { test, expect } = require('@playwright/test');

test.describe('Structured Wage Descriptions', () => {
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
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', {
      state: 'attached',
      timeout: 5000
    });
  });

  async function setDayState(page, day, state) {
    const btn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn[data-state="${state}"], #calc-days-sat .calc-day[data-day="${day}"] .day-btn[data-state="${state}"]`);
    await btn.click();
    await page.waitForTimeout(50);
  }

  test('wage line has structured primary description and day details', async ({ page }) => {
    // Clear week first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Select Mon, Tue, Wed, Thu (full), Sat (half)
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Tue', 'full');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Thu', 'full');
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    await page.fill('#customer_name', 'Test Customer');
    await page.fill('#customer_address', '123 Test Street');
    await page.fill('#notes', 'Test notes');

    await page.click('#calc-add');
    await page.waitForTimeout(100);

    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    expect(await wageRow.isVisible()).toBeTruthy();

    const primaryDesc = await wageRow.locator('input[name="item_description"]').inputValue();
    expect(primaryDesc).toMatch(/Wages\/Retainer — Week of \d{2}–\d{2} [A-Za-z]{3} \d{4}/);
    expect(primaryDesc).not.toContain('$900.00');

    const wageLineRate = await wageRow.locator('input[name="item_rate"]').inputValue();
    expect(wageLineRate).toContain('820');

    const detailsRow = wageRow.locator('..').locator('.wage-details').first();
    expect(await detailsRow.isVisible()).toBeTruthy();

    const detailsText = await detailsRow.textContent();
    expect(detailsText).toContain('Mon — 24th 24/08/2026');
    expect(detailsText).toContain('Tue — 25th 25/08/2026');
    expect(detailsText).toContain('Wed — 26th 26/08/2026');
    expect(detailsText).toContain('Thu — 27th 27/08/2026');
    expect(detailsText).toContain('Sat — 29th 29/08/2026');

    expect(detailsText).not.toContain('Fri');

    const previewItems = page.locator('#pv-items');
    const previewHtml = await previewItems.innerHTML();
    expect(previewHtml).toContain('Wages/Retainer — Week of');
    expect(previewHtml).toContain('Mon — 24th 24/08/2026');
    expect(previewHtml).toContain('Sat — 29th 29/08/2026');
  });

  test('ordinary line items remain compatible', async ({ page }) => {
    // Clear week first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    await setDayState(page, 'Mon', 'full');
    await page.waitForTimeout(100);

    await page.click('#calc-add');
    await page.waitForTimeout(100);

    const wageRow = page.locator('[data-line-item-type="wages"]').first();
    expect(await wageRow.isVisible()).toBeTruthy();

    const detailsRow = wageRow.locator('..').locator('.wage-details').first();
  });

  test('half-day details render correctly', async ({ page }) => {
    // Clear week first
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Select Mon Half, Tue Full
    await setDayState(page, 'Mon', 'half');
    await setDayState(page, 'Tue', 'full');
    await page.waitForTimeout(100);

    await page.fill('#customer_name', 'Half Day Test');
    await page.click('#calc-add');
    await page.waitForTimeout(100);

    const detailsRow = page.locator('.wage-details').first();
    const detailsText = await detailsRow.textContent();

    // Half day should show "Half day — $90"
    expect(detailsText).toContain('Half day');
    expect(detailsText).toContain('$90');

    // Full day should show "Full day — $180"
    expect(detailsText).toContain('Full day');
    expect(detailsText).toContain('$180');
  });
});
