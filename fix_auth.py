import subprocess
import sys

# Get the HEAD version of the file
result = subprocess.run(['git', 'show', 'HEAD:tests/shared-week.spec.js'], capture_output=True, text=True)
if result.returncode != 0:
    print(f"Failed to get HEAD version: {result.stderr}")
    sys.exit(1)
content = result.stdout

lines = content.split('\n')

# Find the start and end of the beforeEach block
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

# Now we have the block from start to end (inclusive).
# We want to keep the listener setup and the store for later use, and replace the rest.

# Find the line with "// Store for later use"
store_line = None
for i in range(start, end+1):
    if lines[i].strip() == '// Store for later use':
        store_line = i
        break

if store_line is None:
    print('Could not find "// Store for later use" line')
    sys.exit(1)

# The store line is followed by two lines: page._jsErrors = errors; and page._consoleMessages = consoleMessages;
# We want to keep from start to store_line+2 (inclusive).
keep_end = store_line + 2
if keep_end >= len(lines):
    print('Unexpected end of file while looking for store lines')
    sys.exit(1)

# Now, we will keep lines[0:keep_end+1] (because we want to include the line at index keep_end)
# Then we will add our new navigation lines.
# Then we will add the closing brace from the original end line (which is lines[end]).

new_lines = lines[0:keep_end+1]  # This includes the store line and the two assignment lines

# Add our new navigation lines (with the same indentation as the original block)
# The original indentation for the block is two spaces (since the test.beforeEach line has two spaces).
# We'll use two spaces for the new lines as well.
indent = '  '
new_lines.append(indent + '')
new_lines.append(indent + '    // Navigate directly to the invoice page, assuming we are authenticated via storageState.')
new_lines.append(indent + '    await page.goto(\'/invoices/new\');')
new_lines.append(indent + '    await page.waitForSelector(\'form#invoice-form\', { state: \'attached\', timeout: 5000 });')

# Now add the closing brace of the beforeEach function (which is at lines[end])
new_lines.append(lines[end])

# Now, we need to add the lines after the beforeEach block (from end+1 to the end of the file)
new_lines.extend(lines[end+1:])

# Join the lines back together
new_content = '\n'.join(new_lines)

# Write the file
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(new_content)

print('Successfully updated tests/shared-week.spec.js')
