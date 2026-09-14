const { test, expect } = require('@playwright/test');

test.describe('Saturday Half-Day', () => {
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
    await expect(page.locator('#invoice-form')).toBeVisible();
  });

  async function setDayState(page, day, state) {
    const btn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn[data-state="${state}"], #calc-days-sat .calc-day[data-day="${day}"] .day-btn[data-state="${state}"]`);
    await btn.click();
    await page.waitForTimeout(50);
  }

  async function getDayState(page, day) {
    const activeBtn = page.locator(`#calc-days-standard .calc-day[data-day="${day}"] .day-btn-active, #calc-days-sat .calc-day[data-day="${day}"] .day-btn-active`);
    return await activeBtn.getAttribute('data-state');
  }

  test('Saturday selects in both directions', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // 1. Select Mon-Thu in Wage Calculator
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Tue', 'full');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Thu', 'full');
    await page.waitForTimeout(100);

    // Verify Mon-Thu selected in both widgets
    expect(await getDayState(page, 'Mon')).toBe('full');
    expect(await getDayState(page, 'Tue')).toBe('full');
    expect(await getDayState(page, 'Wed')).toBe('full');
    expect(await getDayState(page, 'Thu')).toBe('full');

    // Verify total is $720.00 (4 * 180)
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal).toContain('720.00');

    // 2. Select Sat in Wage Calculator
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // 3. Confirm Sat selects in Dates & Notes
    expect(await getDayState(page, 'Sat')).toBe('half');

    // 4. Confirm Sat date is week start +5 (29/08/2026 for week starting 24/08/2026)
    const satDateInput = await page.locator('input[name="date_Sat"]').inputValue();
    expect(satDateInput).toBe('2026-08-29');

    // 5. Confirm breakdown includes "Sat ½: $100.00"
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    expect(calcBreakdown).toContain('Sat ½');
    expect(calcBreakdown).toContain('100.00');

    // 6. Confirm total is $820.00 (720.00 + 100.00)
    const calcTotal2 = await page.locator('#calc-total').textContent();
    expect(calcTotal2).toContain('820.00');

    // 7. Untoggle Sat from Dates & Notes
    await page.locator('#wage-days .wage-day-tile[data-day="Sat"]').click();
    await page.waitForTimeout(100);

    // 8. Confirm it clears in Wage Calculator
    expect(await getDayState(page, 'Sat')).toBe('off');

    // 9. Confirm total returns to $720.00
    const calcTotal3 = await page.locator('#calc-total').textContent();
    expect(calcTotal3).toContain('720.00');

    // 10. Repeat selection in opposite direction (Dates & Notes first)
    await page.locator('#wage-days .wage-day-tile[data-day="Sat"]').click();
    await page.waitForTimeout(100);

    // Confirm Sat selects in Wage Calculator
    expect(await getDayState(page, 'Sat')).toBe('half');

    // Confirm total is $820.00 again
    const calcTotal4 = await page.locator('#calc-total').textContent();
    expect(calcTotal4).toContain('820.00');
  });

  test('Select Mon-Fri deselects Saturday', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // First manually select Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);
    expect(await getDayState(page, 'Sat')).toBe('half');

    // Now click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Verify Mon-Fri selected
    expect(await getDayState(page, 'Mon')).toBe('full');
    expect(await getDayState(page, 'Tue')).toBe('full');
    expect(await getDayState(page, 'Wed')).toBe('full');
    expect(await getDayState(page, 'Thu')).toBe('full');
    expect(await getDayState(page, 'Fri')).toBe('full');

    // Verify Saturday is deselected
    expect(await getDayState(page, 'Sat')).toBe('off');

    // Verify total is $900.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('900.00');
  });

  test('Mon-Fri week totals $900', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Verify total is $900.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('900.00');

    // Verify breakdown shows 5 days
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    expect(calcBreakdown).toContain('Mon');
    expect(calcBreakdown).toContain('Tue');
    expect(calcBreakdown).toContain('Wed');
    expect(calcBreakdown).toContain('Thu');
    expect(calcBreakdown).toContain('Fri');
    expect(calcBreakdown).not.toContain('Sat');
  });

  test('Saturday only totals $100', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Select only Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // Verify total is $100.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal).toContain('100.00');
  });

  test('Mon-Fri + Saturday totals $1000', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Manually add Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // Verify total is $1000.00
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('1000.00');
  });

  test('Deselect Saturday returns to $900', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Add Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // Verify $1000
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('1000.00');

    // Deselect Saturday
    await setDayState(page, 'Sat', 'off');
    await page.waitForTimeout(100);

    // Verify back to $900
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('900.00');
  });

  test('Individual day combinations are correct', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Mon only = $180
    await setDayState(page, 'Mon', 'full');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('180.00');

    // Add Wed + Fri = $540
    await setDayState(page, 'Wed', 'full');
    await page.waitForTimeout(50);
    await setDayState(page, 'Fri', 'full');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('540.00');
  });

  test('Dates display in DD/MM/YYYY format', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Check that date tiles show DD/MM/YYYY format
    const monDate = await page.locator('#wage-days .wage-day-tile[data-day="Mon"] .wage-date-display').textContent();
    expect(monDate).toContain('24/08/2026');

    const satDate = await page.locator('#wage-days .wage-day-tile[data-day="Sat"] .wage-date-display').textContent();
    expect(satDate).toContain('29/08/2026');
  });

  test('Saturday detail appears only when selected', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Select Mon-Fri
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Verify no Saturday in breakdown
    const breakdown = await page.locator('#calc-breakdown').textContent();
    expect(breakdown).not.toContain('Sat');

    // Add Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // Verify Saturday appears in breakdown
    const breakdown2 = await page.locator('#calc-breakdown').textContent();
    expect(breakdown2).toContain('Sat');
    expect(breakdown2).toContain('½');
  });

  test('Half day weekday calculations are correct', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Monday Half = $90
    await setDayState(page, 'Mon', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('90.00');

    // Monday Half + Tuesday Half = $180
    await setDayState(page, 'Tue', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('180.00');

    // Mon-Fri Half = $450
    await setDayState(page, 'Wed', 'half');
    await setDayState(page, 'Thu', 'half');
    await setDayState(page, 'Fri', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('450.00');
  });

  test('Mixed Full and Half week + Saturday = $550', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Monday Full + Tuesday Half + Wednesday Full + Saturday = $550
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Tue', 'half');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('550.00');
  });

  test('Select Mon-Sat sets weekdays Full, Saturday Half', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Click "Select Mon-Sat"
    await page.locator('#select-mon-sat').click();
    await page.waitForTimeout(100);

    // Verify Mon-Fri are full, Sat is half
    expect(await getDayState(page, 'Mon')).toBe('full');
    expect(await getDayState(page, 'Tue')).toBe('full');
    expect(await getDayState(page, 'Wed')).toBe('full');
    expect(await getDayState(page, 'Thu')).toBe('full');
    expect(await getDayState(page, 'Fri')).toBe('full');
    expect(await getDayState(page, 'Sat')).toBe('half');

    // Verify total is $1000
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('1000.00');
  });

  test('Clear Week sets all days off', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // First select some days
    await page.locator('#select-mon-sat').click();
    await page.waitForTimeout(100);
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('1000.00');

    // Click "Clear Week"
    await page.locator('#clear-week').click();
    await page.waitForTimeout(100);

    // Verify all days are off
    expect(await getDayState(page, 'Mon')).toBe('off');
    expect(await getDayState(page, 'Tue')).toBe('off');
    expect(await getDayState(page, 'Wed')).toBe('off');
    expect(await getDayState(page, 'Thu')).toBe('off');
    expect(await getDayState(page, 'Fri')).toBe('off');
    expect(await getDayState(page, 'Sat')).toBe('off');

    // Verify total is $0
    expect(await page.locator('#calc-total').textContent()).toContain('0.00');
  });

  test('Off days are excluded from structured wage details', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Mon Full, Tue Half, Wed Off, Thu Off, Fri Full, Sat Half
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Tue', 'half');
    await setDayState(page, 'Fri', 'full');
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    await page.fill('#customer_name', 'Test Customer');
    await page.fill('#customer_address', '123 Test St');
    await page.click('#calc-add');
    await page.waitForTimeout(100);

    const detailsRow = page.locator('.wage-details').first();
    const detailsText = await detailsRow.textContent();

    // Off days should NOT appear
    expect(detailsText).not.toContain('Wed —');
    expect(detailsText).not.toContain('Thu —');

    // Worked days should appear with correct labels
    expect(detailsText).toContain('Mon —');
    expect(detailsText).toContain('Full day');
    expect(detailsText).toContain('Tue —');
    expect(detailsText).toContain('Half day');
    expect(detailsText).toContain('Fri —');
    expect(detailsText).toContain('Sat —');
  });
});
