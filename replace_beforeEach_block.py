import sys

# Read the file
with open('tests/shared-week.spec.js', 'r') as f:
    content = f.read()

# The old beforeEach block as we saw in the sed output (with the exact whitespace and newlines)
old_block = '''  test.beforeEach(async ({ page>) => {
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

# The new beforeEach block we want to replace it with
new_block = '''  test.beforeEach(async ({ page>) => {
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
if old_block not in content:
    print('Old block not found. Trying to find a variation...')
    # Maybe the file has different line endings? Let's try to normalize.
    # We'll split the content by lines and then join with '\n' to see if we can find the block.
    lines = content.splitlines()
    normalized_content = '\n'.join(lines)
    if old_block in normalized_content:
        content = normalized_content
    else:
        print('Still not found. Let\'s try to find the block by a more flexible method.')
        # We'll try to find the start and end of the block by looking for the lines.
        # We know the start line is: "  test.beforeEach(async ({ page>) => {"
        # and the end line is: "  });" (with the same indentation)
        start_index = None
        end_index = None
        for i, line in enumerate(lines):
            if line.strip() == 'test.beforeEach(async ({ page>) => {':
                start_index = i
                break
        if start_index is not None:
            # Now find the matching closing brace from start_index
            brace_count = 0
            for i in range(start_index, len(lines)):
                for ch in lines[i]:
                    if ch == '{':
                        brace_count += 1
                    elif ch == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_index = i
                            break
                if end_index is not None:
                    break
        if start_index is not None and end_index is not None:
            # We have the start and end indices (inclusive) of the block to replace.
            # Now, we want to replace the lines from start_index to end_index with the new block.
            # But note: the new block might have a different number of lines.
            # We'll split the new block by lines.
            new_block_lines = new_block.splitlines()
            # Build the new lines: lines[0:start_index] + new_block_lines + lines[end_index+1:]
            new_lines = lines[0:start_index] + new_block_lines + lines[end_index+1:]
            # Join the lines back with the original line ending? We'll use '\n' for now.
            content = '\n'.join(new_lines)
        else:
            print('Could not find the block by line indices either.')
            sys.exit(1)
else:
    content = content.replace(old_block, new_block)

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(content)

print('Successfully replaced the beforeEach block.')
