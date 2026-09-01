import subprocess
import sys

# Get the HEAD version of the file
result = subprocess.run(['git', 'show', 'HEAD:tests/shared-week.spec.js'], capture_output=True, text=True)
if result.returncode != 0:
    print(f"Failed to get HEAD version: {result.stderr}")
    sys.exit(1)
content = result.stdout

# We'll replace the beforeEach block.
# Let's split by lines and find the start and end of the beforeEach block.
lines = content.split('\n')
start = None
for i, line in enumerate(lines):
    if line.strip() == 'test.beforeEach(async ({ page>) => {':
        start = i
        break

if start is None:
    print('Could not find test.beforeEach line')
    sys.exit(1)

# Find the matching closing brace
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

# Define the new beforeEach block (with the same indentation as the original, which is two spaces)
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

# Join back with newline
new_content = '\n'.join(new_lines)

# Write the file
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(new_content)

print('Successfully updated tests/shared-week.spec.js')
