const { test, expect } = require('@playwright/test');

test.describe('Equal Six-Day Allocation', () => {
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
    const isSat = day === 'Sat';
    const sel = isSat
      ? `.saturday-controls .day-btn[data-state="${state}"]`
      : `.weekday[data-day="${day}"] .day-btn[data-state="${state}"]`;
    const btn = page.locator(sel);
    await btn.click();
    await page.waitForTimeout(50);
  }

  async function getDayState(page, day) {
    const isSat = day === 'Sat';
    const sel = isSat
      ? `.saturday-controls .day-btn-active`
      : `.weekday[data-day="${day}"] .day-btn-active`;
    const activeBtn = page.locator(sel);
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

    // Four full weekdays total four sixths of $1,000.
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal).toContain('666.67');

    // 2. Select Sat in Wage Calculator
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // 3. Confirm Sat selects in Dates & Notes
    expect(await getDayState(page, 'Sat')).toBe('half');

    // 4. Confirm Sat date is week start +5 (29/08/2026 for week starting 24/08/2026)
    const satDateInput = await page.locator('input[name="date_Sat"]').inputValue();
    expect(satDateInput).toBe('2026-08-29');

    // 5. Confirm Saturday half day is counted in the breakdown.
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    expect(calcBreakdown).toContain('Sat Half');

    // 6. Confirm four full days and a Saturday half day total $750.00.
    const calcTotal2 = await page.locator('#calc-total').textContent();
    expect(calcTotal2).toContain('750.00');

    // 7. Untoggle Sat from Dates & Notes
    await page.locator('#wage-days .wage-day-tile[data-day="Sat"]').click();
    await page.waitForTimeout(100);

    // 8. Confirm it clears in Wage Calculator
    expect(await getDayState(page, 'Sat')).toBe('off');

    // 9. Confirm total returns to four full days = $666.67.
    const calcTotal3 = await page.locator('#calc-total').textContent();
    expect(calcTotal3).toContain('666.67');

    // 10. Repeat selection in opposite direction (Dates & Notes first)
    await page.locator('#wage-days .wage-day-tile[data-day="Sat"]').click();
    await page.waitForTimeout(100);

    // Confirm Sat selects in Wage Calculator
    expect(await getDayState(page, 'Sat')).toBe('half');

    // Confirm total is $750.00 again.
    const calcTotal4 = await page.locator('#calc-total').textContent();
    expect(calcTotal4).toContain('750.00');
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

    // Verify five worked days total $833.33.
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('833.33');
  });

  test('Mon-Fri week totals $833.33', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Verify total is $833.33.
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('833.33');

    // Verify breakdown shows 5 days
    const calcBreakdown = await page.locator('#calc-breakdown').textContent();
    expect(calcBreakdown).toContain('Mon');
    expect(calcBreakdown).toContain('Tue');
    expect(calcBreakdown).toContain('Wed');
    expect(calcBreakdown).toContain('Thu');
    expect(calcBreakdown).toContain('Fri');
    expect(calcBreakdown).not.toContain('Sat');
  });

  test('Saturday half day totals $83.33', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Select only Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // Verify half a day uses half of the shared $1,000 / 6 rate.
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal).toContain('83.33');
  });

  test('Mon-Fri + Saturday half totals $916.67', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Manually add Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // Five full days and one half day total $916.67.
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('916.67');
  });

  test('Deselect Saturday returns to $833.33', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Click "Select Mon-Fri"
    await page.locator('#select-mon-fri').click();
    await page.waitForTimeout(100);

    // Add Saturday
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(100);

    // Verify five full days and one half day total $916.67.
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('916.67');

    // Deselect Saturday
    await setDayState(page, 'Sat', 'off');
    await page.waitForTimeout(100);

    // Verify back to the five-day total of $833.33.
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('833.33');
  });

  test('Individual day combinations are correct', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Mon only = $166.67 when rounded to cents.
    await setDayState(page, 'Mon', 'full');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('166.67');

    // Mon + Wed + Fri = $500.00.
    await setDayState(page, 'Wed', 'full');
    await page.waitForTimeout(50);
    await setDayState(page, 'Fri', 'full');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('500.00');
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
    expect(breakdown2).toContain('Half');
  });

  test('Half day weekday calculations are correct', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Monday Half = $83.33.
    await setDayState(page, 'Mon', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('83.33');

    // Monday Half + Tuesday Half = $166.67.
    await setDayState(page, 'Tue', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('166.67');

    // Mon-Fri Half = $416.67.
    await setDayState(page, 'Wed', 'half');
    await setDayState(page, 'Thu', 'half');
    await setDayState(page, 'Fri', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('416.67');
  });

  test('Mixed Full and Half week + Saturday totals $500', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // Two full days and two half days equal three sixths of $1,000.
    await setDayState(page, 'Mon', 'full');
    await setDayState(page, 'Tue', 'half');
    await setDayState(page, 'Wed', 'full');
    await setDayState(page, 'Sat', 'half');
    await page.waitForTimeout(50);
    expect(await page.locator('#calc-total').textContent()).toContain('500.00');
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

    // Verify five full days and a half Saturday total $916.67.
    const calcTotal = await page.locator('#calc-total').textContent();
    expect(calcTotal.replace(/,/g, '')).toContain('916.67');
  });

  test('Clear Week sets all days off', async ({ page }) => {
    await page.fill('#week_start', '2026-08-24');
    await page.waitForTimeout(100);

    // First select some days
    await page.locator('#select-mon-sat').click();
    await page.waitForTimeout(100);
    expect((await page.locator('#calc-total').textContent()).replace(/,/g, '')).toContain('916.67');

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
    const detailsRow = page.locator('.wage-details').first();
    const detailsText = await detailsRow.textContent();

    // Off days should NOT appear
    expect(detailsText).not.toContain('Wed -');
    expect(detailsText).not.toContain('Thu -');

    // Worked days should appear with correct labels
    expect(detailsText).toContain('Mon -');
    expect(detailsText).toContain('Full day');
    expect(detailsText).toContain('Tue -');
    expect(detailsText).toContain('Half day');
    expect(detailsText).toContain('Fri -');
    expect(detailsText).toContain('Sat -');
  });
});
