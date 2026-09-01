import sys

# Read the file
with open('tests/shared-week.spec.js', 'r') as f:
    lines = f.readlines()

# Find the line index where test.beforeEach starts
start = None
for i, line in enumerate(lines):
    if 'test.beforeEach' in line:
        start = i
        break

if start is None:
    print('Could not find test.beforeEach line')
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
    print('Could not find matching closing brace')
    sys.exit(1)

# Now we have the block from start to end (inclusive)
# We want to replace this block with our new block.

# Determine the indentation of the start line
indent = lines[start][:len(lines[start]) - len(lines[start].lstrip())]

# Define the new block lines (with the same indentation pattern)
# We'll keep the same indentation: the first line has the same indent as the original start line.
# Then the inner lines are indented by an additional two spaces (so total of indent + 2 spaces? Actually the original uses 4 spaces for the inner lines).
# Let's look at the original: the start line has two spaces, then the inner lines have four spaces (so two more).
# We'll replicate that.

# New block content lines (without the leading indent for the first line, and without the extra indent for inner lines)
new_block_content = [
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

# Now, we need to indent each line appropriately.
# The first line should have the same indent as the original start line.
# The inner lines should have the original start line indent plus two spaces (because the original inner lines had two more spaces than the start line).
# Let's compute:
base_indent = indent  # This is the string of spaces at the start of the start line.
inner_indent = base_indent + '  '  # Two more spaces for the inner lines.

# Build the new block lines with proper indentation
new_block_lines = []
for i, line in enumerate(new_block_content):
    if i == 0:
        # First line: just the base indent
        new_block_lines.append(base_indent + line)
    elif line.strip() == '':
        # Empty line: just the base indent
        new_block_lines.append(base_indent)
    else:
        # Inner lines: base indent + two spaces
        new_block_lines.append(inner_indent + line)

# Now, build the new lines: lines[0:start] + new_block_lines + lines[end+1:]
new_lines = lines[0:start] + new_block_lines + lines[end+1:]

# Write back
with open('tests/shared-week.spec.js', 'w') as f:
    f.writelines(new_lines)

print('Successfully replaced the beforeEach block.')
