# AI Agent Guide

> **Related**: [AGENTS.md](../AGENTS.md) — human-written workflow guidance  
> **Also**: [docs/README.md](../docs/README.md) | [docs/architecture.md](architecture.md) | [docs/engineering.md](engineering.md)

---

This guide is designed for AI coding agents working on the Alapaki Tools plugin. It documents architectural rules, extension patterns, reusable abstractions, and common pitfalls.

---

## Before Creating Something New

### Where to Look First

1. **Check `src/libs/`** — Utility functions and service modules live here. If you need a new helper, it likely belongs in `utils.ts` (as a `tUtils` static method) or in a new `src/libs/your-module.ts`.
2. **Check existing abstractions** — See the table in [architecture.md](architecture.md#existing-abstractions).
3. **Check `src/modals/`** — If you need user interaction, use one of the existing modal patterns.
4. **Check AGENTS.md** — The root `AGENTS.md` has human-written workflow notes.

### What to Reuse

| Instead of... | Use... |
|---|---|
| Rolling your own filename generator | `tUtils.randomFilename(ext)` |
| Checking clipboard for images | `tUtils.hasImageInClipboard()` |
| Validating HTTP URLs | `tUtils.isValidHttpUrl(str)` |
| Sanitising vault names for file paths | `tUtils.slugifyVaultName(name)` |
| Inserting content into the editor | `insertContent(editor, filePath?, textContent?, cursor?)` |
| Showing a loading state | `new LoadingModal(this.app)` — set `.status` before opening |
| Making HTTP requests | `axios` with explicit `responseType` |
| Validating mixed-type inputs | `stringOrEmptySchema.parse(value)` |

---

## Extension Patterns

### Adding a New Command

```
1. Add command ID + name in initializePlugin() via this.addCommand()
2. Create a handle method on the plugin class
3. Add context menu item in the editor-menu event handler
4. If the context menu item goes under "Alapaki: More...", add it in contextmenu.ts
5. If it needs user input, create a modal in src/modals/ + Vue component in src/components/
```

### Adding a New API Endpoint Call

```
1. Add endpoint constant to the relevant libs/ file
2. Use axios.post() with the correct responseType (json or arraybuffer)
3. Parse the response shape consistently (check success field)
4. If multipart → FormData; if JSON → plain object
```

### Adding a New Modal

```
1. Create modal class in src/modals/ extending Obsidian's Modal
2. Create Vue component in src/components/
3. Follow the openWithPromise() pattern (see aiprompt_modal.ts)
4. Mount Vue app on this.containerEl.children[1]
5. Clean up in onClose: unmount Vue, empty contentEl
```

---

## DO THIS

```typescript
// ✅ Use the existing LoadingModal
const modal = new LoadingModal(this.app);
modal.status = 'Processing...';
modal.open();
try {
    // work
} finally {
    modal.close();
}
```

```typescript
// ✅ Use stringOrEmptySchema for mixed-type inputs
const [filePath, textContent] = await Promise.all([
    stringOrEmptySchema.parse(_filePath),
    stringOrEmptySchema.parse(_textContent)
]);
```

```typescript
// ✅ Clean up Vue in modal close
onClose() {
    this.vueApp?.unmount();
    this.vueApp = null;
    this.contentEl.empty();
}
```

```typescript
// ✅ New utility methods go on the tUtils class
static myNewHelper(input: string): boolean {
    // ...
}
```

---

## DO NOT DO THIS

```typescript
// ❌ Don't create a new utility class — add to tUtils
class MyNewUtils {  // BAD
    static doThing() {}
}
```

```typescript
// ❌ Don't import main.ts from libs/
import ImgWebpOptimizerPlugin from '../main';  // BAD — circular import risk
```

```typescript
// ❌ Don't use fetch() — all API calls go through axios
fetch(endpointUrl);  // BAD
axios.post(endpointUrl, ...);  // GOOD
```

```typescript
// ❌ Don't forget to lock/unlock
this.locked = true;  // BAD — missing unlock on error path
this.someOperation();  // will never unlock if it throws
```

---

## Common Mistakes

1. **Forgetting to sanitise S3 paths** — `localPathToPartialUrl` now takes a `defName` parameter. Always pass the correct default (`'uploads'`) unless the caller has a specific override.
2. **Calling `saveSettings()` after a partial settings update** — The settings object is a partial (`Partial<ImgOptimizerPluginSettings>`). Use optional chaining when accessing properties, then call `saveSettings()`. See `settings.ts` for the `@ts-expect-error` pattern.
3. **Mixing up OCR pipelines** — `convertImageToMarkdown` (optimize to WebP first) vs `extractTextFromImage` (send original PNG). They hit different endpoints and have different response characteristics.
4. **Omitting `responseType` in axios calls** — Without `responseType: 'json'`, axios infers the type from the Content-Type header. API endpoints returning JSON but served without the header will be parsed incorrectly. Image downloads need `responseType: 'arraybuffer'`.
5. **Nesting Vue state in Obsidian's modal lifecycle** — Vue apps created in `onOpen` must be destroyed in `onClose`. Modal re-opening re-creates the Vue app.

---

## Safe Refactor Areas

| Area | Notes |
|---|---|
| `latex_symbols/` | Pure data — no logic. Adding symbols or categories is safe. |
| `tUtils` static methods | No side effects, no imports from the plugin class. |
| `zhongwen.ts` | Returns prompt strings. No state, no side effects. |
| `prompt-parser.ts` | Self-contained regex + editor operations. Unit-testable. |
| `ocr-utils.ts` helper functions | `handleOCRResponse`, `optimizeImageToWebP` — no plugin deps. |

## High Risk Areas

| Area | Risk |
|---|---|
| `main.ts` → `initializePlugin()` | Registers all commands, events, and views. Any breakage here disables the entire plugin. |
| `main.ts` → `convertWrapper()` | Complex branching (4 paths: native local, native+S3, server local, server+S3). Touch with care. |
| `main.ts` → `handlePromptCallouts()` | Modifies the editor value while iterating prompts. Async + state mutation risk. |
| `settings.ts` | Direct `@ts-expect-error` overrides on partial settings. Changing settings shape requires updating all consumers. |
| `autosuggestions.ts` (`LatexSuggest`) | Integrates with CodeMirror's syntax tree. Changes to `isInMath()` affect all autocomplete triggering. |

---

## Dependency Rules

- `libs/` must never import `main.ts` or any `modals/`.
- `modals/` may import `libs/` but not other `modals/`.
- `latex_symbols/` is zero-dependency — no imports from anywhere.
- `main.ts` may import everything.
- Vue components (`components/*.vue`) should only receive data via props and emit via events — no direct plugin access.

## Reusable Patterns

### Text Generation Pipeline

```
handleXxx(editor) → check locked → lock → LoadingModal
  → build request {prompt, providedText, system}
  → axios.post(apiServer/text/generator, body)
  → parse response: success + result.text
  → insertContent(editor, ...)
  → unlock → close modal
```

Used by: `handleSummarize`, `handlePromptCallouts`, `handleZhongwen`, `handleOCR`.

### Image Pipeline

```
handleXxx(editor) → check clipboard images → lock → LoadingModal
  → convertWrapper(blob, forceS3?) — transforms image
  → insertContent(editor, filePath)
  → unlock → close modal
```

Used by: `handleClipboardImage`, `handleOCR`.

---

## Recent Changes (git diff — `src/libs/utils.ts`)

**Method**: `localPathToPartialUrl`  
**Change**: Added `defName` parameter (default `'uploads'`) and path-traversal sanitization.

```typescript
// Before
static localPathToPartialUrl(localFilePath: string, defName: string = 'uploads'): string

// After
static localPathToPartialUrl(localFilePath: string, defName: string = 'uploads'): string
```

- If the path resolves to `.`, starts with `../`, or contains `/../` anywhere, it falls back to `defName`.
- All callers were updated: `convertWrapper(S3 route)` → passes `uploads` (the default, no explicit override needed).

Check `search_files(pattern='localPathToPartialUrl')` for all usages before modifying this method.