import sys
import re

with open('tests/shared-week.spec.js', 'r') as f:
    content = f.read()

# Pattern to match the beforeEach block (from test.beforeEach to the closing brace of that function)
# We'll use a regex that captures the whole block, assuming no nested braces inside the function (there are some in arrow functions, but we can handle by counting braces)
# Instead, let's do a simpler approach: find the start and end indices by scanning.

lines = content.split('\n')
start = None
for i, line in enumerate(lines):
    if line.strip().startswith('test.beforeEach') and 'async ({ page' in line:
        start = i
        break

if start is None:
    print('ERROR: Could not find test.beforeEach line')
    sys.exit(1)

# Now find the matching closing brace
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

# Now we have the block from start to end (inclusive).
# We'll replace it with our new block.

# Determine the indentation of the start line
indent = lines[start][:len(lines[start]) - len(lines[start].lstrip())]

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
        indented_new_block.append(indent)
    else:
        indented_new_block.append(indent + line)

# Build the new content: lines[0:start] + indented_new_block + lines[end+1:]
new_lines = lines[0:start] + indented_new_block + lines[end+1:]

new_content = '\n'.join(new_lines)

# Write back
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(new_content)

print('SUCCESS: Replaced beforeEach block')
