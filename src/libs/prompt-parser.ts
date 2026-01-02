import { App, Editor, MarkdownView, Notice } from 'obsidian';

/**
 * Searches the active Markdown editor for *top-level* callouts of type "prompt"
 * that include a UUID on the first line. Nested callouts (e.g. `>> [!prompt]`) are skipped.
 *
 * @param app - The Obsidian App instance
 * @returns Record<string, string> mapping UUID → callout body (content lines, with '> ' stripped)
 */
export function getPromptCallouts(app: App): Record<string, string> {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.editor) {
        console.warn("No active Markdown editor found.");
        return {};
    }

    const lines = activeView.editor.getValue().split('\n');
    const result: Record<string, string> = {};

    // Matches only *top-level* prompt callouts: exactly one '>' at start, followed by space and [!prompt] + UUID
    // ^>\s*\[!prompt\]\s+([0-9a-f]{8}(?:-[0-9a-f]{4}){4})\s*$
    const promptCalloutRegex = /^>\s*\[!prompt\]\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        // Skip lines that are nested blockquotes (e.g., ">>", ">>>", etc.)
        if (/^>{2,}/.test(line)) {
            i++;
            continue;
        }

        const match = line.match(promptCalloutRegex);
        if (match) {
            const uuid = match[1];
            const calloutLines: string[] = [];
            i++; // move to first content line

            // Consume subsequent lines that are part of *this* top-level blockquote:
            // - must start with '> ' (exactly one '>' + space or end)
            // - but NOT a new top-level callout (i.e., avoid `> [!type]`)
            // - and NOT nested (`>> ...`)
            while (
                i < lines.length &&
                /^>\s/.test(lines[i]) &&               // starts with '> ' (top-level blockquote continuation)
                !/^>\s*\[![a-z]+\]/i.test(lines[i]) && // not a new callout header
                !/^>{2,}/.test(lines[i])               // not nested
            ) {
                // Strip leading '> ' (allowing optional single space after >)
                const contentLine = lines[i].replace(/^>\s?/, '');
                calloutLines.push(contentLine);
                i++;
            }

            result[uuid] = calloutLines.join('\n');
            continue;
        }
        i++;
    }

    return result;
}

/**
 * Inserts a new "[!prompt] <UUID>" callout at the current cursor position
 * in the active Markdown editor.
 *
 * @param app - The Obsidian App instance
 * @param content - Optional initial content inside the callout (default: "Enter your prompt here.")
 * @returns The generated UUID string, or null if failed
 */
export function insertPromptCallout(editor: Editor, content: string = "Enter your prompt here."): string | null {

    const uuid = generateUUIDv4();

    // Build callout lines
    const calloutLines = [
        `> [!prompt] ${uuid}`,
        `> ${content}`
    ];

    const calloutText = calloutLines.join('\n');

    // Get current cursor position
    const cursor = editor.getCursor();

    // Ensure proper spacing: add blank line before if not at start or after non-blank line
    let prefix = '';
    if (cursor.line > 0) {
        const prevLine = editor.getLine(cursor.line - 1).trim();
        if (prevLine !== '') {
            prefix = '\n';
        }
    }

    // Ensure line after callout is blank (Obsidian best practice)
    const suffix = '\n';

    // Insert
    editor.replaceRange(prefix + calloutText + suffix, cursor);

    // Optional: move cursor inside the callout content (after '> ')
    const newCursorLine = cursor.line + (prefix ? 1 : 0) + 1; // content line
    const newCursorCh = 2 + (content.startsWith(' ') ? 1 : 0); // position after '> '
    editor.setCursor({ line: newCursorLine, ch: newCursorCh });

    return uuid;
}

/**
 * Replaces a "prompt"-type callout (with matching UUID) in the current Markdown file
 * with arbitrary user-provided text — i.e., deletes the callout and inserts the new text.
 *
 * ✅ Only matches top-level prompt callouts
 * ✅ Preserves surrounding blank lines (smart formatting)
 * ✅ Handles multi-line callouts
 * ✅ Returns true on success, false if not found
 *
 * @param app - Obsidian App instance
 * @param targetUUID - The UUID of the prompt callout to replace (case-insensitive, hyphen-normalized)
 * @param replacementText - Text to insert in place of the entire callout (may be empty)
 * @returns boolean — true if callout was found and replaced
 */
export function replacePromptCallout(app: App, targetUUID: string, replacementText: string): boolean {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.editor) {
        new Notice("⚠️ No active Markdown editor.");
        return false;
    }

    const editor = activeView.editor;
    const lines = editor.getValue().split('\n');

    // Normalize UUID for robust matching (strip non-hex, lowercase)
    const normUUID = targetUUID.replace(/[^0-9a-f]/gi, '').toLowerCase();
    if (normUUID.length !== 32) {
        console.warn("Invalid UUID format:", targetUUID);
        return false;
    }
    // Reformat to standard 8-4-4-4-12
    const expectedUUID = [
        normUUID.slice(0, 8),
        normUUID.slice(8, 12),
        normUUID.slice(12, 16),
        normUUID.slice(16, 20),
        normUUID.slice(20)
    ].join('-');

    // Regex for top-level prompt callout header with UUID
    const headerRegex = new RegExp(`^>\\s*\\[!prompt\\]\\s+${expectedUUID}\\s*$`, 'i');

    let startLine = -1;
    let endLine = -1;

    // Step 1: Locate the callout
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip nested lines (>> ...)
        if (/^>{2,}/.test(line)) continue;

        if (headerRegex.test(line)) {
            startLine = i;
            endLine = i;

            // Expand to include all subsequent top-level blockquote lines (part of this callout)
            // Stop when:
            // - line is not a top-level blockquote (`> ...`)
            // - line is a new callout (`> [!type]`)
            // - line is nested (`>> ...`)
            while (
                endLine + 1 < lines.length &&
                /^>\s/.test(lines[endLine + 1]) &&               // top-level blockquote continuation
                !/^>\s*\[![a-z]+\]/i.test(lines[endLine + 1]) && // not a new callout
                !/^>{2,}/.test(lines[endLine + 1])               // not nested
            ) {
                endLine++;
            }

            break;
        }
    }

    if (startLine === -1) {
        new Notice(`CallCheck not found: ${targetUUID}`);
        return false;
    }

    // Step 2: Determine replacement range
    const from = { line: startLine, ch: 0 };
    const to = { line: endLine + 1, ch: 0 }; // end *after* last callout line

    // Step 3: Smart formatting — preserve surrounding blank lines
    let finalText = replacementText;

    // Preserve one leading blank line if original callout had one (or was not at top)
    if (startLine > 0 && lines[startLine - 1].trim() === '') {
        // already blank above → don't add extra
    } else if (startLine > 0) {
        // non-blank above → add blank line before
        finalText = '\n' + finalText;
    }

    // Preserve one trailing blank line if needed
    if (endLine + 1 < lines.length && lines[endLine + 1].trim() !== '') {
        finalText = finalText + '\n';
    }

    // Step 4: Replace
    editor.replaceRange(finalText, from, to);

    new Notice(`CallCheck replaced: ${expectedUUID}`);
    return true;
}

/**
 * Appends text to an existing "prompt"-type callout (with matching UUID) in the current Markdown file.
 * This is useful for adding error messages or intermediate results.
 *
 * @param app - Obsidian App instance
 * @param targetUUID - The UUID of the prompt callout to append to (case-insensitive, hyphen-normalized)
 * @param appendText - Text to append to the callout (will be added on a new line)
 * @returns boolean — true if callout was found and text was appended
 */
export function appendToPromptCallout(app: App, targetUUID: string, appendText: string): boolean {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.editor) {
        new Notice("⚠️ No active Markdown editor.");
        return false;
    }

    const editor = activeView.editor;
    const lines = editor.getValue().split('\n');

    // Normalize UUID for robust matching (strip non-hex, lowercase)
    const normUUID = targetUUID.replace(/[^0-9a-f]/gi, '').toLowerCase();
    if (normUUID.length !== 32) {
        console.warn("Invalid UUID format:", targetUUID);
        return false;
    }
    // Reformat to standard 8-4-4-4-12
    const expectedUUID = [
        normUUID.slice(0, 8),
        normUUID.slice(8, 12),
        normUUID.slice(12, 16),
        normUUID.slice(16, 20),
        normUUID.slice(20)
    ].join('-');

    // Regex for top-level prompt callout header with UUID
    const headerRegex = new RegExp(`^>\\s*\\[!prompt\\]\\s+${expectedUUID}\\s*$`, 'i');

    let startLine = -1;
    let endLine = -1;

    // Step 1: Locate the callout
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip nested lines (>> ...)
        if (/^>{2,}/.test(line)) continue;

        if (headerRegex.test(line)) {
            startLine = i;
            endLine = i;

            // Expand to include all subsequent top-level blockquote lines (part of this callout)
            while (
                endLine + 1 < lines.length &&
                /^>\s/.test(lines[endLine + 1]) &&               // top-level blockquote continuation
                !/^>\s*\[![a-z]+\]/i.test(lines[endLine + 1]) && // not a new callout
                !/^>{2,}/.test(lines[endLine + 1])               // not nested
            ) {
                endLine++;
            }

            break;
        }
    }

    if (startLine === -1) {
        new Notice(`CallCheck not found: ${targetUUID}`);
        return false;
    }

    // Step 2: Append text after the last line of the callout
    const insertPosition = { line: endLine + 1, ch: 0 };
    const formattedText = `\n> ${appendText.replace(/\n/g, '\n> ')}`;
    
    editor.replaceRange(formattedText, insertPosition);

    new Notice(`Text appended to: ${expectedUUID}`);
    return true;
}

/**
 * Generates a random UUID v4 (RFC 4122 compliant)
 * Lightweight, no external deps.
 */
function generateUUIDv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
