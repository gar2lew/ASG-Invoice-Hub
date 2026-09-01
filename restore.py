import sys

# Read the current file (which is the HEAD version after checkout)
with open('tests/shared-week.spec.js', 'r') as f:
    content = f.read()

# Define the old beforeEach block (from HEAD)
old_before_each = '''  test.beforeEach(async ({ page>) => {
    // Listen for JavaScript errors and console messages
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

    // Store for later use
    page._jsErrors = errors;
    page._consoleMessages = consoleMessages;

    // Login as administrator first
    await page.goto('/login');
    
    // Handle the login screen - select administrator option if present
    const adminLabel = page.locator('p:has-text(\"Administrator\")');
    if (await adminLabel.count() > 0) {
      await adminLabel.first().click();
      await page.waitForTimeout(500);
    }
    
    // Fill in the admin login form
    await page.fill('input[name=\"username\"]', 'admin');
    await page.fill('input[name=\"password\"]', 'changeme');
    
    // Click the admin sign in button
    await page.click('button:has-text(\"Admin sign in\")');
    
    // Wait for login to complete (redirect to dashboard or invoices)
    await page.waitForTimeout(2000);
    
    // Navigate to the new invoice page
    await page.goto('/invoices/new');
    await page.waitForTimeout(1000); // Wait for page to load
  });'''

# Define the new beforeEach block
new_before_each = '''  test.beforeEach(async ({ page>) => {
    // Listen for JavaScript errors and console messages
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

    // Store for later use
    page._jsErrors = errors;
    page._consoleMessages = consoleMessages;

    // Navigate directly to the invoice page, assuming we are authenticated via storageState.
    await page.goto('/invoices/new');
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });
  });'''

# Replace the old block with the new block
if old_before_each not in content:
    print('Old beforeEach block not found in the file.')
    sys.exit(1)

new_content = content.replace(old_before_each, new_before_each)

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(new_content)

print('Successfully replaced beforeEach block.')
