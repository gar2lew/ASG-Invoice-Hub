import sys

# Read the file
with open('tests/shared-week.spec.js', 'r') as f:
    lines = f.readlines()

# Find the start line index of mounting test.beforeEach
start = None
for i, line in enumerate(lines):
    if 'test.beforeEach' in line and 'async ({ page' in line:
        start = i
        break

if start is None:
    print('ERROR: Could not find test.beforeEach line')
    sys.exit(1)

# Now, from the start line, we want to find the matching closing brace for the function body.
# We'll initialize brace count to 0 and then iterate from start to end.
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
    print('ERROR: Could not find matching closing brace for test.beforeEach')
    sys.exit(1)

# Now we have the function from line start to line end (inclusive).
# We want to replace this entire block with our new block.

# Determine the indentation of the original test.beforeEach line
original_indent = lines[start][:len(lines[start]) - len(lines[start].lstrip())]

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
    '  };'
]

# Indent each line of the new block by the original indent
indented_new_block = []
for line in new_block:
    if line.strip() == '':
        indented_new_block.append(original_indent)
    else:
        indented_new_block.append(original_indent + line)

# Build the new content: lines[0:start] + indented_new_block + lines[end+1:]
new_lines = lines[0:start] + indented_new_block + lines[end+1:]

# Write the file back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('SUCCESS: Replaced test.beforeEach block')
