import sys

# Read the backup file
with open('tests/shared-week.spec.js.backup', 'r') as f:
    content = f.read()

# Find the start of the test.beforeEach block
start = content.find('test.beforeEach(async ({ page>) => {')
if start == -1:
    print('Could not find test.beforeEach')
    sys.exit(1)

# Now find the matching closing brace
brace_count = 0
end = start
for i in range(start, len(content)):
    ch = content[i]
    if ch == '{':
        brace_count += 1
    elif ch == '}':
        brace_count -= 1
        if brace_count == 0:
            end = i
            break

if end == start:
    print('Could not find matching closing brace')
    sys.exit(1)

# Define the new block
new_block = '''  test.beforeEach(async ({ page }) => {
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
new_content = content[:start] + new_block + content[end+1:]

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(new_content)

print('Replaced beforeEach block using string replacement')
