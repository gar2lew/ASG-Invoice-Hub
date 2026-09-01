import sys

def instrument_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Function to insert a log line after the opening brace of a function
    def insert_log_after_open_brace(lines, start_idx, log_text):
        # We assume the function starts at start_idx and the opening brace is on the same line
        line = lines[start_idx]
        # Find the position of the opening brace
        brace_pos = line.find('{')
        if brace_pos == -1:
            return False  # No opening brace on this line
        # We want to insert a new line after this line, with the same indentation as the line
        indent = len(line) - len(line.lstrip())
        # Insert a new line after the current line
        lines.insert(start_idx + 1, ' ' * indent + log_text + '\n')
        return True

    # Find test.beforeEach
    for i, line in enumerate(lines):
        if line.strip().startswith('test.beforeEach(async ({ page }) => {'):
            if not insert_log_after_open_brace(lines, i, "console.log('[SW] beforeEach entered');"):
                return False
            break
    else:
        print('ERROR: Could not find test.beforeEach')
        return False

    # Find the first test: test('Week date populates both widgets', async ({ page }) => {
    for i, line in enumerate(lines):
        if line.strip().startswith("test('Week date populates both widgets', async ({ page }) => {"):
            if not insert_log_after_open_brace(lines, i, "console.log('[SW TEST] entered');"):
                return False
            break
    else:
        print('ERROR: Could not find test')
        return False

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    return True

if __name__ == '__main__':
    if instrument_file('C:/dev/REP INVOICE SYSTEM/tests/shared-week.spec.js'):
        print('Instrumentation successful')
        sys.exit(0)
    else:
        print('Instrumentation failed')
        sys.exit(1)
