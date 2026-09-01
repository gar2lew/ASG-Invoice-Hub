import sys

# Read the file
with open('tests/shared-week.spec.js', 'r') as f:
    lines = f.readlines()

# Find the start of the test.beforeEach line
start_line_idx = None
for i, line in enumerate(lines):
    if line.strip().startswith('test.beforeEach(async ({ page>) => {'):
        start_line_idx = i
        break

if start_line_idx is None:
    # Try without the extra '>'
    for i, line in enumerate(lines):
        if line.strip().startswith('test.beforeEach(async ({ page>) => {'):
            start_line_idx = i
            break

if start_line_idx is None:
    print('ERROR: Could not find test.beforeEach line')
    sys.exit(1)

# The function declaration line is at start_line_idx.
# The body starts at start_line_idx + 1.
# We need to find the matching closing brace for the function body, starting from the line after the declaration.
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

# Now, we want to keep the lines before the function declaration and after the closing brace.
# And replace the lines from start_line_idx to end_line_idx (inclusive) with our new function.

# Determine the indentation of the function declaration line (which is the same as the body's base indent)
base_indent = lines[start_line_idx][:len(lines[start_line_idx]) - len(lines[start_line_idx].lstrip())]

# Define the new function body lines (without the base indent)
new_body_lines = [
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

# Now, indent each line of the new body with the base indent, except for empty lines which just get the base indent.
indented_new_body = []
for line in new_body_lines:
    if line.strip() == '':
        indented_new_body.append(base_indent)
    else:
        indented_new_body.append(base_indent + line)

# Build the new file content: lines before start_line_idx + indented_new_body + lines after end_line_idx
new_lines = lines[:start_line_idx] + indented_new_body + lines[end_line_idx+1:]

# Write back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('SUCCESS: Replaced test.beforeEach block')
