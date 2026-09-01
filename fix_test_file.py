import sys

# Read the file
with open('tests/shared-week.spec.js', 'r') as f:
    lines = f.readlines()

# Find the line that contains "test.beforeEach" and has "async ({ page" in it (allowing for extra characters)
start_line_idx = None
for i, line in enumerate(lines):
    if 'test.beforeEach' in line and 'async ({ page' in line:
        start_line_idx = i
        break

if start_line_idx is None:
    print('ERROR: Could not find test.beforeEach line')
    sys.exit(1)

# Now, from this line, we want to find the matching closing brace for the function body.
# We'll start counting braces from this line.
brace_count = 0
end_line_idx = None
for i in range(start_line_idx, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                end_line_idx = i
                break
    if end_line_idx is not None:
        break

if end_line_idx is None:
    print('ERROR: Could not find matching closing brace for test.beforeEach')
    sys.exit(1)

# Now we have the function from line start_line_idx to line end_line_idx (inclusive).
# We want to replace this entire block with our new block.

# Determine the indentation of the original test.beforeEach line
original_indent = lines[start_line_idx][:len(lines[start_line_idx]) - len(lines[start_line_idx].lstrip())]

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

# Indent each line of the new block by the original indent
indented_new_block = []
for line in new_block:
    if line.strip() == '':
        indented_new_block.append(original_indent)
    else:
        indented_new_block.append(original_indent + line)

# Build the new content: lines[0:start_line_idx] + indented_new_block + lines[end_line_idx+1:]
new_lines = lines[0:start_line_idx] + indented_new_block + lines[end_line_idx+1:]

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('SUCCESS: Replaced test.beforeEach block')
