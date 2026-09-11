const { test, expect } = require('@playwright/test');

// Use the E2E rep storage state for authenticated rep tests
test.use({ storageState: 'e2e-storage-state.json' });

test.describe('Self-Service Profile', () => {
  // Reset profile to known state before each test to ensure isolation
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="name"]', 'E2E Test Representative');
    await page.fill('input[name="email"]', 'e2e-rep@test.local');
    await page.fill('input[name="phone"]', '');
    await page.fill('input[name="abn"]', '12 345 678 901');
    await page.fill('input[name="bank_name"]', 'Test Bank');
    await page.fill('input[name="bank_bsb"]', '123456');
    await page.fill('input[name="bank_account"]', '12345678');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('Profile updated successfully');
    // Reset PIN to 1234 for test consistency
    await page.request.post('/profile/reset-pin');
  });

  test('rep can open My Profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('.page-title')).toHaveText('My Profile');
  });

  test('profile is pre-populated with own values', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('input[name="name"]')).not.toHaveValue('');
    await expect(page.locator('input[name="name"]')).toHaveValue(/E2E Test Representative|Test Rep/);
  });

  test('update name persists after reload', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="name"]', 'Updated Rep Name');
    await page.click('button:has-text("Save Profile")');
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('.flash')).toContainText('Profile updated successfully');
    await page.goto('/profile');
    await expect(page.locator('input[name="name"]')).toHaveValue('Updated Rep Name');
  });

  test('update email persists', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="email"]', 'updated@example.com');
    await page.click('button:has-text("Save Profile")');
    await expect(page).toHaveURL('/profile');
    await page.goto('/profile');
    await expect(page.locator('input[name="email"]')).toHaveValue('updated@example.com');
  });

  test('update phone persists', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="phone"]', '0400 123 456');
    await page.click('button:has-text("Save Profile")');
    await expect(page).toHaveURL('/profile');
    await page.goto('/profile');
    await expect(page.locator('input[name="phone"]')).toHaveValue('0400 123 456');
  });

  test('update ABN persists', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="abn"]', '12 345 678 901');
    await page.click('button:has-text("Save Profile")');
    await expect(page).toHaveURL('/profile');
    await page.goto('/profile');
    await expect(page.locator('input[name="abn"]')).toHaveValue('12 345 678 901');
  });

  test('update bank details persists', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="bank_name"]', 'Commonwealth Bank');
    await page.fill('input[name="bank_bsb"]', '062-000');
    await page.fill('input[name="bank_account"]', '00012345');
    await page.click('button:has-text("Save Profile")');
    await expect(page).toHaveURL('/profile');
    await page.goto('/profile');
    await expect(page.locator('input[name="bank_name"]')).toHaveValue('Commonwealth Bank');
    await expect(page.locator('input[name="bank_bsb"]')).toHaveValue('062-000');
    await expect(page.locator('input[name="bank_account"]')).toHaveValue('00012345');
  });

  test('account number leading zero preserved', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="bank_account"]', '00123456');
    await page.click('button:has-text("Save Profile")');
    await expect(page).toHaveURL('/profile');
    await page.goto('/profile');
    await expect(page.locator('input[name="bank_account"]')).toHaveValue('00123456');
  });

  test('profile completeness shows Complete when all bank fields present', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="bank_name"]', 'Test Bank');
    await page.fill('input[name="bank_bsb"]', '123-456');
    await page.fill('input[name="bank_account"]', '98765432');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.status-complete')).toBeVisible();
  });

  test('profile completeness shows Missing when bank fields empty', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="bank_name"]', '');
    await page.fill('input[name="bank_bsb"]', '');
    await page.fill('input[name="bank_account"]', '');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.status-missing')).toBeVisible();
  });

  test('save without PIN leaves PIN unchanged', async ({ page }) => {
    // Reset name first (may have been changed by previous test)
    await page.goto('/profile');
    await page.fill('input[name="name"]', 'E2E Test Representative');
    await page.click('button:has-text("Save Profile")');
    await expect(page).toHaveURL('/profile');
    
    // Now test saving without PIN
    await page.goto('/profile');
    await page.fill('input[name="phone"]', '0400 999 888');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('Profile updated successfully');
    // Verify we can still log out and back in with original PIN
    await page.request.post('/logout');
    await page.goto('/login');
    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('/');
  });

  test('PIN change with correct current PIN works', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="current_pin"]', '1234');
    await page.fill('input[name="new_pin"]', '5678');
    await page.fill('input[name="confirm_pin"]', '5678');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('Profile updated successfully');
    // Verify new PIN works
    await page.request.post('/logout');
    await page.goto('/login');
    await page.selectOption('select[name="user_id"]', { label: 'E2E Test Representative' });
    await page.fill('input[name="pin"]', '5678');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('/');
    // Reset back to 1234 for other tests
    await page.goto('/profile');
    await page.fill('input[name="current_pin"]', '5678');
    await page.fill('input[name="new_pin"]', '1234');
    await page.fill('input[name="confirm_pin"]', '1234');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('Profile updated successfully');
  });

  test('PIN change with incorrect current PIN rejected', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="current_pin"]', '9999');
    await page.fill('input[name="new_pin"]', '5678');
    await page.fill('input[name="confirm_pin"]', '5678');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('Current PIN is incorrect');
  });

  test('PIN change with less than 4 digits rejected', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="current_pin"]', '1234');
    await page.fill('input[name="new_pin"]', '12');
    await page.fill('input[name="confirm_pin"]', '12');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('New PIN must be exactly 4 digits');
  });

  test('PIN change with non-numeric PIN rejected', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="current_pin"]', '1234');
    await page.fill('input[name="new_pin"]', 'abcd');
    await page.fill('input[name="confirm_pin"]', 'abcd');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('New PIN must be exactly 4 digits');
  });

  test('PIN change with mismatched confirmation rejected', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="current_pin"]', '1234');
    await page.fill('input[name="new_pin"]', '5678');
    await page.fill('input[name="confirm_pin"]', '9999');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('New PIN and confirmation do not match');
  });

  test('PIN change without current PIN rejected', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="new_pin"]', '5678');
    await page.fill('input[name="confirm_pin"]', '5678');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('Current PIN is required');
  });

  test('rep cannot modify another rep via POST payload', async ({ page }) => {
    // Attempt to POST to /profile with a different user_id (should be ignored)
    const response = await page.request.post('/profile', {
      data: {
        name: 'Hacked Name',
        email: 'hacked@example.com',
        user_id: 9999,
      },
    });
    // Should succeed but update own profile, not user 9999
    expect(response.status()).toBe(200);
    // Verify our own profile was updated (not another user's)
    await page.goto('/profile');
    await expect(page.locator('input[name="name"]')).toHaveValue('Hacked Name');
    // Reset
    await page.fill('input[name="name"]', 'E2E Test Representative');
    await page.click('button:has-text("Save Profile")');
  });

  test('unauthenticated user cannot access My Profile', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
    await context.close();
  });

  test('updated values flow into new invoice', async ({ page }) => {
    await page.goto('/profile');
    await page.fill('input[name="name"]', 'Invoice Flow Test');
    await page.fill('input[name="abn"]', '99 888 777 666');
    await page.fill('input[name="email"]', 'e2e-rep@test.local');
    await page.fill('input[name="bank_name"]', 'Test Bank');
    await page.fill('input[name="bank_bsb"]', '123456');
    await page.fill('input[name="bank_account"]', '12345678');
    await page.click('button:has-text("Save Profile")');
    await expect(page.locator('.flash')).toContainText('Profile updated successfully');
    // Create new invoice and verify rep name/ABN flow
    await page.goto('/invoices/new');
    // Preview uses invoiceRepDetails which shows in #pv-rep-details
    await expect(page.locator('#pv-rep-details')).toContainText('Invoice Flow Test');
    await expect(page.locator('#pv-rep-details')).toContainText('99 888 777 666');
    // Reset
    await page.goto('/profile');
    await page.fill('input[name="name"]', 'E2E Test Representative');
    await page.fill('input[name="abn"]', '12 345 678 901');
    await page.click('button:has-text("Save Profile")');
  });
});
