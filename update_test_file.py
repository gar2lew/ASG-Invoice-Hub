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
    # Try without the extra > in the pattern (maybe it's a typo in the backup)
    for i, line in enumerate(lines):
        if line.strip().startswith('test.beforeEach(async ({ page>) => {'):
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

# Now we have the function from line start to line end (inclusive).
# We want to replace the entire block (from start to end) with our new block.
# But note: we want to keep the same indentation level for the new block as the original.
# The original block's indentation is the whitespace at the beginning of the start line.
original_indent = lines[start][:len(lines[start]) - len(lines[start].lstrip())]

# Define the new block lines (without indentation)
new_block = [
    'test.beforeEach(async ({ page }) => {',
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
    '  });'
]

# Indent each line of the new block by the original indent
indented_new_block = [original_indent + line if line.strip() != '' else original_indent for line in new_block]

# Build the new content: lines[0:start] + indented_new_block + lines[end+1:]
new_lines = lines[0:start] + indented_new_block + lines[end+1:]

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('Replaced test.beforeEach block')
