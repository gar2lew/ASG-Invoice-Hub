import sys

with open('tests/shared-week.spec.js', 'r') as f:
    lines = f.readlines()

# Find the start line index of test.beforeEach
start_idx = None
for i, line in enumerate(lines):
    if 'test.beforeEach' in line and 'async ({ page' in line:
        start_idx = i
        break

if start_idx is None:
    print('Could not find test.beforeEach line')
    sys.exit(1)

# Now find the matching closing brace
brace_count = 0
end_idx = None
for i in range(start_idx, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break
    if end_idx is not None:
        break

if end_idx is None:
    print('Could not find matching closing brace')
    sys.exit(1)

# Now we have the function from start_idx to end_idx (inclusive)
# We want to replace this block with our new block

# Determine the indentation of the start line
indent = lines[start_idx][:len(lines[start_idx]) - len(lines[start_idx].lstrip())]

# Define the new block lines (without indentation)
new_block = [
    'test.beforeEach(async ({ page>) => {',
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

# Indent each line of the new block
indented_new_block = []
for line in new_block:
    if line.strip() == '':
        indented_new_block.append(indent)
    else:
        indented_new_block.append(indent + line)

# Build the new lines: lines before start_idx + indented_new_block + lines after end_idx
new_lines = lines[:start_idx] + indented_new_block + lines[end_idx+1:]

# Write back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('Successfully replaced test.beforeEach block')
