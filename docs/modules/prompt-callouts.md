# Prompt Callouts

## Purpose

The Prompt Callouts module enables an LLM-powered inline assistant workflow inside Obsidian. Users write `> [!prompt] <UUID>` callouts in their notes, fill in the prompt text beneath, and then run "LLM: Answer Prompts" to have each callout replaced by the LLM's response. This allows prompts and answers to coexist in the same document, with the answer replacing the callout block.

## Scope

This module covers all functions exported from `src/libs/prompt-parser.ts` and their integration in `main.ts` via `handlePromptCallouts()`. It does **not** cover general Obsidian callout syntax — only the `[!prompt]` variant.

## Architecture / Flow

### Inserting a Prompt

```
  User: Right-click → "Alapaki: More..." → "LLM: New Prompt"
        │
        ▼
  insertPromptCallout(editor)
        │
        ├── Generates UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
        ├── Inserts at cursor:
        │     > [!prompt] <UUID>
        │     > Enter your prompt here.
        ├── Adds blank line above/below for proper spacing
        └── Returns the UUID string
```

### Answering Prompts

```
  User: Right-click → "Alapaki: More..." → "LLM: Answer Prompts"
        │
        ▼
  handlePromptCallouts()         [main.ts:642]
        │
        ├── Checks lock (waits if image conversion in progress)
        ├── Calls getPromptCallouts(app)
        │       │
        │       ▼
        │   Scans active editor for all top-level > [!prompt] <UUID>
        │   Returns Record<UUID, content>  (content = lines after header, stripped of "> ")
        │
        └── For each [uuid, prompt] entry:
              ├── Lock + open LoadingModal("Reasoning...")
              ├── POST /text/generator with prompt JSON
              ├── On success: replacePromptCallout(app, uuid, resultText)
              │     └── Replaces entire callout block with result text (smart whitespace)
              ├── On error: appendToPromptCallout(app, uuid, errorText)
              │     └── Appends error line(s) inside the existing callout
              └── Close modal + release lock
```

## Key Files

| File | Role |
|------|------|
| `src/libs/prompt-parser.ts` | 4 exported functions: `getPromptCallouts`, `insertPromptCallout`, `replacePromptCallout`, `appendToPromptCallout` + private helper `generateUUIDv4` |
| `src/main.ts` (`handlePromptCallouts`, line 642) | Iterates over prompts, calls API, handles success/error per UUID |
| `src/libs/contextmenu.ts` | Registers "LLM: New Prompt" and "LLM: Answer Prompts" submenu items |

## Key Functions

### `getPromptCallouts(app: App): Record<string, string>`

- Scans the **active** Markdown editor (not all open editors).
- Only matches **top-level** callouts: lines starting with exactly `>` at column 0.
- Header regex: `/^>\s*\[!prompt\]\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i`
- Nested blockquotes (`>>`, `>>>`) and nested callouts inside the prompt block are skipped.
- Content lines have the leading `> ` stripped.
- UUID regex for matching in content: `/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i`

### `insertPromptCallout(editor: Editor, content?: string): string | null`

- Generates UUID v4 with zero external dependencies (Math.random-based).
- Smart spacing: adds blank line before if the previous line is non-empty.
- Adds trailing newline after the callout.
- Sets cursor position inside the callout content for immediate typing.

### `replacePromptCallout(app: App, uuid: string, text: string): boolean`

- Normalizes UUID (strips non-hex, lowercases, reformats to 8-4-4-4-12).
- Locates the callout by header regex, expands to include all top-level content lines.
- Smart formatting: preserves a blank line above/below the replacement to keep document clean.
- Shows Notice on success/failure.

### `appendToPromptCallout(app: App, uuid: string, text: string): boolean`

- Same UUID normalization and location as `replacePromptCallout`.
- Appends text on a new line(s), prefixing each line with `> `.
- Used for error reporting so the original prompt callout is preserved with the error attached.

## Conventions

- **UUID format**: Standard 8-4-4-4-12 hex (RFC 4122 v4). The `generateUUIDv4()` function is local (not exported).
- **UUID normalization**: All lookup functions normalize input UUID by stripping non-hex chars and lowercasing, then reformatting. This makes matching robust against formatting differences.
- **Only top-level callouts are processed** — nested callouts and multi-depth blockquotes are always skipped.
- **The `/text/generator` endpoint** receives `{ prompt, providedText, system }` where the system prompt is hardcoded in `handlePromptCallouts` (instruction to output Markdown without heading syntax or horizontal rules).

## Common Mistakes

1. **Editing the system prompt in main.ts without updating the docs.** The system prompt string lives inside the `for` loop in `handlePromptCallouts`. If changed, also update the module docs.

2. **Putting prompts in nested callouts.** `getPromptCallouts` explicitly skips lines starting with `>>` or more. Prompts must be top-level `> [!prompt] ...`.

3. **Using a non-standard UUID format.** If the header line has extra whitespace or missing hyphens, the regex won't match. The regex is strict: `/^>\s*\[!prompt\]\s+<uuid>\s*$/i`.

4. **Forgetting that only the active editor is scanned.** `getPromptCallouts` uses `app.workspace.getActiveViewOfType(MarkdownView)` — it will not find prompts in other open tabs.

5. **Not testing with empty prompt content.** If the user never writes anything under the `> [!prompt]` line, the content string will be empty, which still gets sent to the API. Consider an empty-content guard.

6. **Overlapping prompts with the lock.** If an image conversion is running, `handlePromptCallouts` will bail early. Always check and respect `this.locked`.
