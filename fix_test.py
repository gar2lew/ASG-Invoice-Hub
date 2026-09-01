import sys
with open('tests/shared-week.spec.js.backup', 'r') as f:
    lines = f.readlines()

# Find the start and end of the test.beforeEach block
start = None
for i, line in enumerate(lines):
    if line.strip().startswith('test.beforeEach(async ({ page>) => {'):
        start = i
        break

if start is None:
    # Try a more flexible match
    for i, line in enumerate(lines):
        if 'test.beforeEach' in line and 'async' in line and '{' in line:
            start = i
            break

if start is None:
    print('Could not find test.beforeEach')
    sys.exit(1)

# Now find the matching closing brace for the function body.
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

# Determine the indentation of the body: look at the line at start+1 (first line of the body)
body_indent = lines[start+1][:len(lines[start+1]) - len(lines[start+1].lstrip())]

# Define the new body lines (with the same indentation)
new_body = [
    body_indent + '// Listen for JavaScript errors and console messages',
    body_indent + 'const errors = [];',
    body_indent + 'const consoleMessages = [];',
    body_indent + "page.on('console', msg => {",
    body_indent + '  consoleMessages.push(`${msg.type()}: ${msg.text()}`);',
    body_indent + '  if (msg.type() === \"error\") {',
    body_indent + '    errors.push(`${msg.type()}: ${msg.text()}`);',
    body_indent + '  }',
    body_indent + '});',
    body_indent + "page.on('pageerror', err => {",
    body_indent + '  errors.push(`PAGE ERROR: ${err.message}`);',
    body_indent + '});',
    '',
    body_indent + '// Store for later use',
    body_indent + 'page._jsErrors = errors;',
    body_indent + 'page._consoleMessages = consoleMessages;',
    '',
    body_indent + '// Navigate directly to the invoice page, assuming we are authenticated via storageState.',
    body_indent + \"await page.goto('/invoices/new');\",
    body_indent + \"await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });\"
]

# Build the new content: lines[0:start+1] (up to and including the function declaration) + new_body + lines[end:] (from the closing brace to the end)
new_lines = lines[0:start+1] + new_body + lines[end:]

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('Replaced test.beforeEach body')
