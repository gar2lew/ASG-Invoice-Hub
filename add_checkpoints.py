import sys

def main():
    filename = 'tests/shared-week.spec.js'
    with open(filename, 'r') as f:
        lines = f.readlines()

    # We'll build new lines
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if we are in the test function we want to modify
        # We'll use a simple approach: we'll look for the test function by name and then process until its closing brace.
        # But to keep it simple, we'll just look for specific lines and insert logs around them.

        # We'll handle the test function: 'changing week start does not clear selected days'
        # We'll look for the test declaration and then process until we see the closing brace of that test.
        # However, we don't want to modify other tests.

        # Instead, we'll do a series of replacements for specific lines.

        # We'll do the insertions by building a list of insertions (line index, text to insert, before/after)
        # and then apply them in reverse order.

        # For now, let's just do the simple thing: we'll insert the logs we know we need by searching for the lines.

        # We'll do this in a second pass: first collect the insertions, then apply.

        # We'll break and do the insertion after collecting.
        i += 1

    # Instead of the above, let's do a direct approach: we'll write the new lines by checking for the targets.
    # We'll reset and do a fresh pass.

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()

        # We are going to look for specific lines and insert logs before and/or after.
        # We'll define a list of tuples: (substring_to_match, insert_before, insert_after)
        # where insert_before and insert_after are the strings to insert (including the newline and indentation).

        # We'll compute the indentation of the current line.
        indent = line[:len(line) - len(stripped)]

        # We'll check for each target. We'll assume each target appears only once in the file (or we handle the first occurrence).

        # We'll use a flag to avoid processing the same line multiple times for different targets.
        # We'll break after the first match.

        matched = False

        # Test function: 'changing week start does not clear selected days'
        # We'll look for the test declaration and then set a flag that we are in that test until we see the closing brace.
        # But we don't want to modify other parts of the file.

        # Given the time, we'll do a simpler approach: we'll only insert the logs for the lines we are sure about.

        # Let's list the lines we want to insert logs around (from the instructions):

        # In the test function:
        #   await ensureAllUnchecked(page);
        #   await page.locator('#calc-days .calc-day:has(input[data-day=\"Mon\"])').click();
        #   await page.locator('#calc-days .calc-day:has(input[data-day=\"Wed\"])').click();
        #   const monChecked = await page.locator('#calc-days input[data-day=\"Mon\"]').isChecked();
        #   const wedChecked = await page.locator('#calc-days input[data-day=\"Wed\"]').isChecked();
        #   await page.fill('#week_start', newWeekStart);
        #   const monCheckboxAfter = page.locator('#calc-days input[data-day=\"Mon\"]');
        #   const wedCheckboxAfter = page.locator('#calc-days input[data-day=\"Wed\"]');
        #   await monCheckboxAfter.waitFor({ state: 'attached', timeout: 2000 });
        #   await wedCheckboxAfter.waitFor({ state: 'attached', timeout: 2000 });
        #   expect(await monCheckboxAfter.isChecked()).toBe(monChecked);
        #   expect(await wedCheckboxAfter.isChecked()).toBe(wedChecked);
        #   const weekStartInput = await page.locator('#week_start').inputValue();
        #   expect(weekStartInput).toBe(newWeekStart);

        # In ensureAllUnchecked:
        #   console.log('[ensureAllUnchecked] entered');  // after the opening brace
        #   for each day:
        #       console.log('[ensureAllUnchecked] day', day);
        #       console.log('[ensureAllUnchecked] before wage isChecked', day);
        #       const wageChecked = await wageInput.isChecked();
        #       console.log('[ensureAllUnchecked] after wage isChecked', day, wageChecked);
        #       console.log('[ensureAllUnchecked] before notes isChecked', day);
        #       const notesChecked = await page.locator(`#wage-days input[name=\"wage_day\"][data-day=\"${day}\"]`).isChecked();
        #       console.log('[ensureAllUnchecked] after notes isChecked', day, notesChecked);
        #       console.log('[ensureAllUnchecked] before click', day);
        #       // existing click if required
        #       console.log('[ensureAllUnchecked] after click', day);
        #       console.log('[ensureAllUnchecked] before assertions', day);
        #       // existing assertions
        #       console.log('[ensureAllUnchecked] after assertions', day);
        #   console.log('[ensureAllUnchecked] completed');

        # We'll handle the test function first by looking for the specific lines.

        # We'll do a simple string match for the lines we want to target.

        # We'll define a list of targets for the test function.
        # Each target is (substring, before_log, after_log)
        # We'll insert the before_log before the line and the after_log after the line.

        # We'll do this for the test function only. We'll assume we are in the test function if we have seen the test declaration and not yet seen the closing brace.
        # But to keep it simple, we'll just insert for the first occurrence of each line.

        # We'll use a set to avoid inserting multiple times for the same line.

        # Let's define the targets for the test function.
        test_targets = [
            ("await ensureAllUnchecked(page);", "[SW20] before ensureAllUnchecked", "[SW20] after ensureAllUnchecked"),
            ("await page.locator('#calc-days .calc-day:has(input[data-day=\"Mon\"])').click();", "[SW20] before Mon click", "[SW20] after Mon click"),
            ("await page.locator('#calc-days .calc-day:has(input[data-day=\"Wed\"])').click();", "[SW20] before Wed click", "[SW20] after Wed click"),
            ("const monChecked = await page.locator('#calc-days input[data-day=\"Mon\"]').isChecked();", "[SW20] before reading initial states", None),
            ("const wedChecked = await page.locator('#calc-days input[data-day=\"Wed\"]').isChecked();", None, "[SW20] after reading initial states"),
            ("await page.fill('#week_start', newWeekStart);", "[SW20] before week_start change", "[SW20] after week_start change"),
            ("const monCheckboxAfter = page.locator('#calc-days input[data-day=\"Mon\"]');", "[SW20] before final checkbox lookups", "[SW20] after final checkbox lookups"),
            ("const wedCheckboxAfter = page.locator('#calc-days input[data-day=\"Wed\"]');", None, None),  # We'll skip this one for now
            ("await monCheckboxAfter.waitFor({ state: 'attached', timeout: 2000 });", None, None),
            ("await wedCheckboxAfter.waitFor({ state: 'attached', timeout: 2000 });", None, None),
            ("expect(await monCheckboxAfter.isChecked()).toBe(monChecked);", None, None),
            ("expect(await wedCheckboxAfter.isChecked()).toBe(wedChecked);", None, None),
            ("const weekStartInput = await page.locator('#week_start').inputValue();", None, None),
            ("expect(weekStartInput).toBe(newWeekStart);", "[SW20] completed", None)
        ]

        # We'll also add the entered test log at the beginning of the test function.
        # We'll do that by finding the opening brace of the test function.

        # We'll handle the test function opening brace separately.

        # Let's first handle the test function opening brace and the entered log.

        # We'll look for the test declaration and then the next line that is just '{'
        if "test('changing week start does not clear selected days'" in line:
            # We'll look for the opening brace in the next lines.
            for j in range(i+1, len(lines)):
                if lines[j].strip() == '{':
                    # We found the opening brace. We'll insert the entered log after it.
                    new_lines.append(line)
                    i += 1
                    # Now we are at the opening brace line.
                    new_lines.append(lines[i])  # the opening brace line
                    # Insert the entered log after the opening brace.
                    new_lines.append(indent + "    console.log('[SW20] entered test');\n")
                    i += 1
                    matched = True
                    break
            if not matched:
                # If we didn't find the opening brace, we just add the line and move on.
                new_lines.append(line)
                i += 1
            continue

        # Now we'll look for the targets in the test function.
        # We'll only do this if we are inside the test function. We'll use a flag.
        # We'll set a flag when we see the test declaration and unset when we see the closing brace.
        # We'll do that by keeping a state.

        # Let's change our approach: we'll keep a state variable that tells us if we are in the test function.
        # We'll set it to True when we see the test declaration and set it to False when we see the closing brace of the test function.

        # We'll need to know the closing brace of the test function. We'll do brace matching.

        # Given the complexity and the time, we'll assume that the test function is the only one we care about and we'll just insert the logs for the lines we want.

        # We'll try to match the line and if it matches, we'll insert the logs.

        # We'll do the matching for the test function targets.

        for target, before_log, after_log in test_targets:
            if target in line:
                # We found a target line.
                # We'll insert the before log if it exists.
                if before_log:
                    new_lines.append(indent + f"    console.log('{before_log}');\n")
                new_lines.append(line)
                if after_log:
                    new_lines.append(indent + f"    console.log('{after_log}');\n")
                matched = True
                break

        if matched:
            i += 1
            continue

        # Now we'll handle ensureAllUnchecked function.
        # We'll look for the function declaration and then process its body.

        # We'll look for: "async function ensureAllUnchecked(page) {"
        if "async function ensureAllUnchecked(page) {" in line:
            # We found the function declaration.
            # We'll add the function declaration line.
            new_lines.append(line)
            i += 1
            # Now we expect the opening brace on the next line.
            if i < len(lines) and lines[i].strip() == '{':
                new_lines.append(lines[i])  # the opening brace
                i += 1
                # Insert the entered log after the opening brace.
                new_lines.append(indent + "    console.log('[ensureAllUnchecked] entered');\n")
                # Now we will process the rest of the function body.
                # We'll look for the for loop and the lines inside.
                # We'll set a flag that we are in the function and we'll look for the closing brace.
                # We'll do brace matching for the function.
                brace_count = 1  # we have already passed the opening brace
                # We'll process until the matching closing brace.
                while i < len(lines) and brace_count > 0:
                    l = lines[i]
                    stripped_l = l.lstrip()
                    indent_l = l[:len(l) - len(l.lstrip())]
                    # Check for brace changes
                    if stripped_l.startswith('{'):
                        brace_count += 1
                    elif stripped_l.startswith('}'):
                        brace_count -= 1
                        if brace_count == 0:
                            # We are at the closing brace of the function.
                            # Before we add the closing brace, we insert the completed log.
                            new_lines.append(indent_l + "    console.log('[ensureAllUnchecked] completed');\n")
                            new_lines.append(l)
                            i += 1
                            break
                    # Now we look for the for loop and the lines inside.
                    # We'll look for: "for (const day of days) {"
                    if "for (const day of days) {" in l:
                        # We found the for loop.
                        # We'll add the for loop line.
                        new_lines.append(l)
                        i += 1
                        # Now we expect the opening brace of the for loop.
                        if i < len(lines) and lines[i].strip() == '{':
                            new_lines.append(lines[i])  # the opening brace of the for loop
                            i += 1
                            # Insert the day log after the opening brace of the for loop.
                            new_lines.append(indent_l + "        console.log('[ensureAllUnchecked] day', day);\n")
                            # Now we will process the for loop body.
                            # We'll set a brace count for the for loop.
                            brace_count_for = 1
                            while i < len(lines) and brace_count_for > 0:
                                l2 = lines[i]
                                stripped_l2 = l2.lstrip()
                                indent_l2 = l2[:len(l2) - len(l2.lstrip())]
                                if stripped_l2.startswith('{'):
                                    brace_count_for += 1
                                elif stripped_l2.startswith('}'):
                                    brace_count_for -= 1
                                    if brace_count_for == 0:
                                        # We are at the closing brace of the for loop.
                                        # We'll add the closing brace and break.
                                        new_lines.append(l2)
                                        i += 1
                                        break
                                # Now we look for the lines inside the for loop body.
                                # We'll insert logs before and after specific lines.
                                # We'll define the targets for the for loop body.
                                # We'll look for:
                                #   const wageChecked = await wageInput.isChecked();
                                #   const notesChecked = await page.locator(`#wage-days input[name=\"wage_day\"][data-day=\"${day}\"]\)).isChecked();
                                #   if (await wageInput.isChecked()) {
                                #   await wageControl.click();
                                #   await expect(wageInput).not.toBeChecked();
                                #   await expect(page.locator(`#wage-days input[name=\"wage_day\"][data-day=\"${day}\"]\))).not.toBeChecked();
                                # We'll insert before and after each of these.
                                # We'll also insert the wageInput line? We don't need to log it, but we need to log before and after the wage isChecked.
                                # We'll look for the wageChecked line and the notesChecked line.
                                # We'll also look for the click and the assertions.
                                # We'll do a simple string match.
                                if "const wageChecked = await wageInput.isChecked();" in l2:
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] before wage isChecked');\n")
                                    new_lines.append(l2)
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] after wage isChecked');\n")
                                elif "const notesChecked = await page.locator(`#wage-days input[name=\"wage_day\"][data-day=\"${day}\"]\)).isChecked();" in l2:
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] before notes isChecked');\n")
                                    new_lines.append(l2)
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] after notes isChecked');\n")
                                elif "if (await wageInput.isChecked()) {" in l2:
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] before click');\n")
                                    new_lines.append(l2)
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] after click');\n")
                                elif "await wageControl.click();" in l2:
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] before click');\n")
                                    new_lines.append(l2)
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] after click');\n")
                                elif "await expect(wageInput).not.toBeChecked();" in l2:
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] before assertions');\n")
                                    new_lines.append(l2)
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] after assertions');\n")
                                elif "await expect(page.locator(`#wage-days input[name=\"wage_day\"][data-day=\"${day}\"]\))).not.toBeChecked();" in l2:
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] before assertions');\n")
                                    new_lines.append(l2)
                                    new_lines.append(indent_l2 + "        console.log('[ensureAllUnchecked] after assertions');\n")
                                else:
                                    # If none of the above, just add the line.
                                    new_lines.append(l2)
                                i += 1
                            # After the for loop body, we continue with the function body.
                            continue
                    # If we didn't match any of the above, just add the line.
                    new_lines.append(l)
                    i += 1
                # We have processed the function body and the closing brace.
                matched = True
                break
            else:
                # If we didn't find the opening brace, we just add the line and move on.
                new_lines.append(line)
                i += 1
            continue

        # If we didn't match any of the above, just add the line.
        new_lines.append(line)
        i += 1

    # Write the file back
    with open(filename, 'w') as f:
        f.writelines(new_lines)

    print('Checkpoints added successfully')

if __name__ == '__main__':
    main()