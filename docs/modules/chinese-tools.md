# Chinese Language Tools (Zhongwen)

## Purpose

The Chinese Language Tools module provides LLM-powered Chinese language analysis directly within the Obsidian editor. Users can select Chinese text and get grammar explanations, learners-dictionary-style definitions (in English or Vietnamese), or full sentence breakdowns — all without leaving their note.

## Scope

This module covers a single export from `src/libs/zhongwen.ts` — the `zhongwenTasks()` function — and its integration in `main.ts` via `handleZhongwen()`. It handles four distinct language tasks:

| Task | Description |
|------|-------------|
| `grammar` | Explain a Chinese grammar point in English with meaning, usage, examples (table with Chinese/Pinyin/English), common mistakes, and notes |
| `word-usage-en` | Learners-dictionary entry in English: headword, POS, definition, usage notes, example sentences |
| `word-usage-vi` | Same as above but in Vietnamese for Vietnamese-speaking learners |
| `explain` | Full sentence breakdown: English translation, key grammar points, particles, verb complements, word order, and learner pitfalls |

## Architecture / Flow

```
User selects text in editor
        │
        ▼
  Right-click → "Alapaki: More..." → "Zhongwen: <task>"
        │
        ▼
  handleZhongwen(editor, task)   [main.ts:456]
        │
        ├── Validates selection (non-empty)
        ├── Checks lock (prevents concurrent operations)
        ├── Opens LoadingModal ("Analyzing text...")
        ├── Calls zhongwenTasks(task, selectedText)
        │       │
        │       ▼
        │   Returns { prompt, providedText, system }
        │   (switch on task builds the appropriate system prompt)
        │
        ├── POST /text/zhongwen with JSON body
        ├── Closes LoadingModal, releases lock
        └── Inserts result below original selection via insertContent()
```

### Lock / Unlock Pattern

The plugin uses a single `this.locked` boolean flag. All LLM operations (Chinese tools, prompt callouts, image conversion) share this lock. If locked, the user sees `"Image Conversion in Progress: Please hold on for a moment"`. This prevents overlapping LLM calls.

## Key Files

| File | Role |
|------|------|
| `src/libs/zhongwen.ts` | Pure function `zhongwenTasks()` — no imports, no side effects, unit-testable |
| `src/main.ts` (`handleZhongwen`, line 456) | Orchestrates the full flow: validation → lock → modal → API call → insert result |
| `src/libs/contextmenu.ts` | Registers the four Zhongwen submenu items under "Alapaki: More..." |

## Conventions

- **No external dependencies**: `zhongwenTasks()` is a pure TypeScript function with zero imports.
- **System prompts** follow a standard pattern: they identify the assistant's role (e.g. "Chinese language teacher", "bilingual lexicography assistant") and instruct Markdown-only output.
- **Task type is a union type**: `'grammar' | 'word-usage-en' | 'word-usage-vi' | 'explain'` — always pass a literal, never a string.
- **Full system prompt text lives in the source file** (see `src/libs/zhongwen.ts` lines 34, 65, 96, 112). Do not duplicate it elsewhere; reference it instead.
- **Error handling**: On API failure, the error message is inserted inline below the original text so the user can see what went wrong without losing context.

## Common Mistakes

1. **Adding new tasks without updating the union type.** The `tasks` parameter is typed — adding a new case to the switch without adding it to the type union will cause a TypeScript error.

2. **Duplicating system prompt text** in main.ts or elsewhere. The prompt/system pairs are defined solely in `zhongwen.ts`. `handleZhongwen` destructures them.

3. **Forgetting the lock check.** Every LLM operation must check `this.locked` at the top and set `this.locked = true` before making the API call. Failure to do so can cause overlapping requests.

4. **Passing untrimmed selected text** — the function trims with `.trim()` but downstream prompts embed `${providedText}` directly, so very long selections produce very long prompts. Consider adding a length guard for extremely long text.

5. **Assuming the API endpoint is `/text/zhongwen`** — this endpoint path is configurable only through the `apiServer` setting prefix (e.g., `http://localhost:3001/text/zhongwen`). The suffix `/text/zhongwen` is hardcoded in `handleZhongwen`.
