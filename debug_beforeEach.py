import sys
with open('tests/shared-week.spec.js.backup', 'r') as f:
    lines = f.readlines()
# Find the test.beforeEach line
start = None
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
# We want to keep the line at start (the function declaration) and the line at end (the closing brace) and replace everything in between.
# Build new lines.
indent = lines[start][:len(lines[start]) - len(lines[start].lstrip())]
body_indent = indent + '  '
# We want to keep the original body but insert two console.log lines right after the 'await page.goto('/login');' line.
# So we need to find that line within the original body (lines[start+1:end]) and insert after it.
# Let's extract the original body lines (excluding the function declaration and closing brace).
original_body = lines[start+1:end]  # these are the lines inside the function
# We'll create a new body by iterating through original_body and inserting after the goto line.
new_body = []
for line in original_body:
    new_body.append(line)
    if line.strip().startswith('await page.goto(\'/login\');'):
        # Insert two console.log lines
        new_body.append(body_indent + "    console.log('[BE] URL after /login:', page.url());\n")
        new_body.append(body_indent + "    console.log('[BE] login form count:', await page.locator('form.stack:not(.login-admin-form)').count());\n")
# Now build the new content: lines[0:start+1] (up to and including the function declaration) + new_body + lines[end:] (from the closing brace to the end)
new_lines = lines[0:start+1] + new_body + lines[end:]
with open('tests/shared-week.spec.js', 'w') as f:
    f.write(''.join(new_lines))
print('Inserted debug logs after goto(/login)')
