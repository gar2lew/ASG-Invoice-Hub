import sys

# Read the current file (which should be HEAD after checkout)
with open('tests/shared-week.spec.js', 'r') as f:
    lines = f.readlines()

# Find the start and end of the beforeEach block we want to replace.
start = None
end = None
for i, line in enumerate(lines):
    if line.strip() == 'test.beforeEach(async ({ page>) => {':
        start = i
        break

if start is None:
    # Try without the extra spaces in the pattern
    for i, line in enumerate(lines):
        if line.strip().startswith('test.beforeEach') and 'async ({ page' in line:
            start = i
            break

if start is None:
    print('ERROR: Could not find test.beforeEach line')
    sys.exit(1)

# Now find the matching closing brace
brace_count = 0
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
    print('ERROR: Could not find matching closing brace for test.beforeEach')
    sys.exit(1)

# Now we have the block from start to end (inclusive). We'll replace it.

# Define the new beforeEach block lines (with the same indentation as the original, which is two spaces)
new_block = [
    '  test.beforeEach(async ({ page>) => {',
    '    // Listen for JavaScript errors and console messages',
    '    const errors = [];',
    '    const consoleMessages = [];',
    '    page.on(\'console\', msg => {',
    '      consoleMessages.push(`${msg.type()}: ${msg.text()}`);',
    '      if (msg.type() === \'error\') {',
    '        errors.push(`${msg.type()}: ${msg.text()}`);',
    '      }',
    '    });',
    '    page.on(\'pageerror\', err => {',
    '      errors.push(`PAGE ERROR: ${err.message}`);',
    '    });',
    '',
    '    // Store for later use',
    '    page._jsErrors = errors;',
    '    page._consoleMessages = consoleMessages;',
    '',
    '    // Navigate directly to the invoice page, assuming we are authenticated via storageState.',
    '    await page.goto(\'/invoices/new\');',
    '    await page.waitForSelector(\'form#invoice-form\', { state: \'attached\', timeout: 5000 });',
    '  }'
]

# Build the new lines: lines[0:start] + new_block + lines[end+1:]
new_lines = lines[0:start] + new_block + lines[end+1:]

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('SUCCESS: Replaced beforeEach block')
