
import sys

def insert_after(lines, index, new_line):
    lines.insert(index + 1, new_line)

def main():
    filename = "tests/shared-week.spec.js"
    with open(filename, 'r') as f:
        lines = f.readlines()

    # 1. Test function: 'changing week start does not clear selected days'
    # Find the test function
    test_start = None
    for i, line in enumerate(lines):
        if "test('changing week start does not clear selected days'" in line:
            test_start = i
            break
    if test_start is None:
        print("ERROR: Test function not found")
        sys.exit(1)

    # Find the opening brace after the test line
    brace_open = None
    for i in range(test_start, len(lines)):
        if lines[i].strip() == '{':
            brace_open = i
            break
    if brace_open is None:
        print("ERROR: Opening brace not found")
        sys.exit(1)

    # Insert after the opening brace: entered test log
    insert_after(lines, brace_open, "    console.log('[SW20] entered test');")

    # 2. Before and after ensureAllUnchecked
    target = "await ensureAllUnchecked(page);"
    for i in range(len(lines)):
        if target in lines[i]:
            lines.insert(i, "    console.log('[SW20] before ensureAllUnchecked');\n")
            lines.insert(i + 2, "    console.log('[SW20] after ensureAllUnchecked');\n")
            break

    # 3. Before and after Mon click
    target = "await page.locator('#calc-days .calc-day:has(input[data-day="Mon"])').click();"
    for i in range(len(lines)):
        if target in lines[i]:
            lines.insert(i, "    console.log('[SW20] before Mon click');\n")
            lines.insert(i + 2, "    console.log('[SW20] after Mon click');\n")
            break

    # 4. Before and after Wed click
    target = "await page.locator('#calc-days .calc-day:has(input[data-day="Wed"])').click();"
    for i in range(len(lines)):
        if target in lines[i]:
            lines.insert(i, "    console.log('[SW20] before Wed click');\n")
            lines.insert(i + 2, "    console.log('[SW20] after Wed click');\n")
            break

    # 5. Before reading initial states (before monChecked) and after reading initial states (after wedChecked)
    target_mon = "const monChecked = await page.locator('#calc-days input[data-day="Mon"]').isChecked();"
    for i in range(len(lines)):
        if target_mon in lines[i]:
            lines.insert(i, "    console.log('[SW20] before reading initial states');\n")
            # Now find wedChecked line after this
            target_wed = "const wedChecked = await page.locator('#calc-days input[data-day="Wed"]').isChecked();"
            for j in range(i+1, len(lines)):
                if target_wed in lines[j]:
                    lines.insert(j + 1, "    console.log('[SW20] after reading initial states');\n")
                    break
            break

    # 6. Before and after week_start change
    target = "await page.fill('#week_start', newWeekStart);"
    for i in range(len(lines)):
        if target in lines[i]:
            lines.insert(i, "    console.log('[SW20] before week_start change');\n")
            lines.insert(i + 2, "    console.log('[SW20] after week_start change');\n")
            break

    # 7. Before final checkbox lookups (before monCheckboxAfter) and after final checkbox lookups (after the expect(weekStartInput).toBe(newWeekStart); line)
    target_mon_cb = "const monCheckboxAfter = page.locator('#calc-days input[data-day="Mon"]');"
    for i in range(len(lines)):
        if target_mon_cb in lines[i]:
            lines.insert(i, "    console.log('[SW20] before final checkbox lookups');\n")
            # Now find the line: expect(weekStartInput).toBe(newWeekStart);
            target_after = "expect(weekStartInput).toBe(newWeekStart);"
            for j in range(i+1, len(lines)):
                if target_after in lines[j]:
                    lines.insert(j + 1, "    console.log('[SW20] after final checkbox lookups');\n")
                    break
            break

    # 8. The completed log at the end of the test function (before the closing brace)
    # Find the closing brace of the test function
    brace_count = 0
    test_end = None
    for i in range(test_start, len(lines)):
        if lines[i].strip() == '{':
            brace_count += 1
        elif lines[i].strip() == '}':
            brace_count -= 1
            if brace_count == 0:
                test_end = i
                break
    if test_end is None:
        print("ERROR: Could not find closing brace of test function")
        sys.exit(1)

    # Insert before the closing brace: the completed log
    lines.insert(test_end, "    console.log('[SW20] completed');\n")

    # Now modify ensureAllUnchecked function
    # Find the function
    ensure_start = None
    for i, line in enumerate(lines):
        if "async function ensureAllUnchecked(page) {" in line:
            ensure_start = i
            break
    if ensure_start is None:
        print("ERROR: ensureAllUnchecked not found")
        sys.exit(1)

    # Find the opening brace of the function
    brace_open_ensure = None
    for i in range(ensure_start, len(lines)):
        if lines[i].strip() == '{':
            brace_open_ensure = i
            break
    if brace_open_ensure is None:
        print("ERROR: Opening brace of ensureAllUnchecked not found")
        sys.exit(1)

    # Insert after the opening brace: entered log
    insert_after(lines, brace_open_ensure, "    console.log('[ensureAllUnchecked] entered');")

    # Find the for loop: "for (const day of days) {"
    for_loop_start = None
    for i in range(ensure_start, len(lines)):
        if lines[i].strip().startswith("for (const day of days)"):
            # The next line should be the opening brace of the for loop.
            for j in range(i, len(lines)):
                if lines[j].strip() == '{':
                    for_loop_start = j
                    break
            break
    if for_loop_start is None:
        print("ERROR: For loop not found")
        sys.exit(1)

    # Insert after the opening brace of the for loop: day log
    insert_after(lines, for_loop_start, "        console.log('[ensureAllUnchecked] day', day);")

    # Find the end of the for loop by brace matching
    brace_count = 0
    for_loop_end = None
    for i in range(for_loop_start, len(lines)):
        if lines[i].strip() == '{':
            brace_count += 1
        elif lines[i].strip() == '}':
            brace_count -= 1
            if brace_count == 0:
                for_loop_end = i
                break
    if for_loop_end is None:
        print("ERROR: Could not find end of for loop")
        sys.exit(1)

    # Now we'll process the lines inside the for loop (from for_loop_start+1 to for_loop_end-1) and insert checkpoints.
    # We'll do it in reverse order to avoid shifting issues.

    # We'll define the target lines and the before/after messages.
    # We'll target:
    #   const wageChecked = await wageInput.isChecked();
    #   const notesChecked = await page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]\)).isChecked();
    #   if (await wageInput.isChecked()) {
    #   await wageControl.click();
    #   await expect(wageInput).not.toBeChecked();
    #   await expect(page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]\))).not.toBeChecked();

    # We'll create a list of (line_index, before_msg, after_msg) for each target we find.
    to_insert_ensure = []

    # We'll search for each target in the for loop body.
    for i in range(for_loop_start + 1, for_loop_end):
        line = lines[i]
        if "const wageChecked = await wageInput.isChecked();" in line:
            to_insert_ensure.append((i, "[ensureAllUnchecked] before wage isChecked", "[ensureAllUnchecked] after wage isChecked"))
        elif "const notesChecked = await page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]\)).isChecked();" in line:
            to_insert_ensure.append((i, "[ensureAllUnchecked] before notes isChecked", "[ensureAllUnchecked] after notes isChecked"))
        elif "if (await wageInput.isChecked()) {" in line:
            to_insert_ensure.append((i, "[ensureAllUnchecked] before click", "[ensureAllUnchecked] after click"))
        elif "await wageControl.click();" in line:
            to_insert_ensure.append((i, "[ensureAllUnchecked] before click", "[ensureAllUnchecked] after click"))
        elif "await expect(wageInput).not.toBeChecked();" in line:
            to_insert_ensure.append((i, "[ensureAllUnchecked] before assertions", "[ensureAllUnchecked] after assertions"))
        elif "await expect(page.locator(`#wage-days input[name="wage_day"][data-day="${day}"]\))).not.toBeChecked();" in line:
            to_insert_ensure.append((i, "[ensureAllUnchecked] before assertions", "[ensureAllUnchecked] after assertions"))

    # Now we'll insert in reverse order.
    to_insert_ensure.sort(key=lambda x: x[0], reverse=True)

    for idx, before_msg, after_msg in to_insert_ensure:
        if before_msg:
            lines.insert(idx, f"        console.log('{before_msg}');\n")
            idx += 1  # because we inserted a line before, the index of the original line increased by 1
        if after_msg:
            lines.insert(idx + 1, f"        console.log('{after_msg}');\n")

    # Finally, insert the completed checkpoint at the end of the function (before the closing brace).
    # We'll find the closing brace of the ensureAllUnchecked function.
    brace_count = 0
    ensure_end = None
    for i in range(brace_open_ensure, len(lines)):
        if lines[i].strip() == '{':
            brace_count += 1
        elif lines[i].strip() == '}':
            brace_count -= 1
            if brace_count == 0:
                ensure_end = i
                break
    if ensure_end is None:
        print("ERROR: Could not find closing brace of ensureAllUnchecked function")
        sys.exit(1)

    # Insert before the closing brace: the completed log
    lines.insert(ensure_end, "    console.log('[ensureAllUnchecked] completed');\n")

    # Write the file back
    with open(filename, 'w') as f:
        f.writelines(lines)

    print('File modified with checkpoint logging')

if __name__ == '__main__':
    main()
