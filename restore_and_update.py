import sys
import subprocess

# Get the original HEAD version of the file
result = subprocess.run(['git', 'show', 'HEAD:tests/shared-week.spec.js'], capture_output=True, text=True)
if result.returncode != 0:
    print(f"Failed to get HEAD version: {result.stderr}")
    sys.exit(1)
original_content = result.stdout

# Now, we want to replace the beforeEach block in original_content with a new one.
# We'll find the start and end of the beforeEach block.

lines = original_content.split('\n')
start_index = None
for i, line in enumerate(lines):
    if line.strip() == 'test.beforeEach(async ({ page>) => {':
        start_index = i
        break

if start_index is None:
    print("Could not find the start of the beforeEach block")
    sys.exit(1)

# Now find the matching closing brace
brace_count = 0
end_index = None
for i in range(start_index, len(lines)):
    for ch in lines[i]:
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                end_index = i
                break
    if end_index is not None:
        break

if end_index is None:
    print("Could not find the end of the beforeEach block")
    sys.exit(1)

# Define the new beforeEach block (with the same indentation as the original, which is two spaces)
new_before_each = [
    "  test.beforeEach(async ({ page>) => {",
    "    // Listen for JavaScript errors and console messages",
    "    const errors = [];",
    "    const consoleMessages = [];",
    "    page.on('console', msg => {",
    "      consoleMessages.push(`${msg.type()}: ${msg.text()}`);",
    "      if (msg.type() === 'error') {",
    "        errors.push(`${msg.type()}: ${msg.text()}`);",
    "      }",
    "    });",
    "    page.on('pageerror', err => {",
    "      errors.push(`PAGE ERROR: ${err.message}`);",
    "    });",
    "",
    "    // Store for later use",
    "    page._jsErrors = errors;",
    "    page._consoleMessages = consoleMessages;",
    "",
    "    // Navigate directly to the invoice page, assuming we are authenticated via storageState.",
    "    await page.goto('/invoices/new');",
    "    await page.waitForSelector('form#invoice-form', { state: 'attached', timeout: 5000 });",
    "  }"
]

# Build the new lines: lines[0:start_index] + new_before_each + lines[end_index+1:]
new_lines = lines[0:start_index] + new_before_each + lines[end_index+1:]

# Join the lines back with newline
new_content = '\n'.join(new_lines)

# Write the file
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(new_content)

print("Successfully restored and updated tests/shared-week.spec.js")
