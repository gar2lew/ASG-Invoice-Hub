import sys

# Read the backup file
with open('tests/shared-week.spec.js.backup', 'r') as f:
    lines = f.readlines()

# Find the start index of the test.beforeEach line
start = None
for i, line in enumerate(lines):
    if line.strip().startswith('test.beforeEach(async ({ page>) => {'):
        start = i
        break

if start is None:
    # try without the extra >
    for i, line in enumerate(lines):
        if line.strip().startswith('test.beforeEach(async ({ page>) => {'):
            start = i
            break

if start is None:
    print('Could not find test.beforeEach')
    sys.exit(1)

# The body starts at start+1
body_indent = lines[start+1][:len(lines[start+1]) - len(lines[start+1].lstrip())]

# Now, we want to keep the lines[0:start+1] (up to and including the test.beforeEach line) and then replace the body until the matching closing brace.

# We'll find the matching closing brace for the function body (starting from start)
brace_count = 0
end = None
for i in range(start, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i
                break
    if end is not None:
        break

if end is None:
    print('Could not find matching closing brace')
    sys.exit(1)

# Define the new body as a raw string to avoid escaping issues
new_body = r'''    // Listen for JavaScript errors and console messages
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
    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });'''

# Split the new body by newline and prepend the body_indent to each line
new_body_lines = [body_indent + line for line in new_body.split('\n')]

# Build the new content: lines[0:start+1] (up to and including the function declaration) + new_body_lines + lines[end:] (from the closing brace to the end)
new_lines = lines[0:start+1] + new_body_lines + lines[end:]

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.write('\n'.join(new_lines))

print('Replaced test.beforeEach body')
