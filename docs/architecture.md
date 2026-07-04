# Architecture

> **Related**: [docs/README.md](README.md) | [docs/ai/agent-guide.md](ai/agent-guide.md)  
> **Source entry point**: `src/main.ts`

---

## Purpose

The Alapaki Tools plugin extends Obsidian with a suite of editor utilities: image optimization, OCR, AI text operations, LaTeX authoring, Chinese language analysis, and a dictionary sidebar.

## Scope

This document covers the system-level architecture: module boundaries, dependency flow, the request lifecycle for key features, and the plugin's relationship with Obsidian's plugin API.

---

## Module Map

```
src/
├── main.ts                 # Plugin class — commands, menus, handle methods
├── settings.ts             # Settings tab + defaults
├── libs/                   # Shared utility & service modules
│   ├── utils.ts            # tUtils — randomFilename, localPathToPartialUrl,
│   │                       #   slugifyVaultName, isValidHttpUrl,
│   │                       #   convertImageLocally, hasImageInClipboard
│   ├── ocr-utils.ts        # OCR pipeline (optimize → upload → parse)
│   ├── contextmenu.ts      # Editor right-click submenu registration
│   ├── autosuggestions.ts  # LatexSuggest — CodeMirror editor suggest
│   ├── prompt-parser.ts    # LLM prompt callout system
│   ├── zhongwen.ts         # Chinese language analysis prompts + system messages
│   └── plugin_interfaces.ts# ImgOptimizerPluginSettings interface + Zod schemas
├── modals/                 # Vue 3 modals wrapping Obsidian's Modal API
│   ├── aiprompt_modal.ts   # Image-to-Markdown result modal
│   ├── latex_modal.ts      # LaTeX symbol browser/inserter
│   ├── changecase_modal.ts # Text case converter
│   ├── localfile_modal.ts  # Local file insertion modal
│   └── loading_modal.ts    # Generic loading spinner modal
├── latex_symbols/          # LaTeX symbol definition files by category
│   ├── latexAll.ts, interfaces.ts, arrowSymbols.ts, greekHebrewSymbols.ts,
│   │   miscellaneousSymbols.ts, miscellaneousSymbolsTwo.ts,
│   │   relationsSymbols.ts, negatedRelations.ts,
│   │   mathModeAccents.ts, accentsDelimitersSymbols.ts
├── dict/                   # Dictionary sidebar view (Vue 3)
│   ├── dictUI.ts           # ItemView wrapping the Vue app
│   └── dictUI.vue          # Vue 3 dictionary component
├── components/             # Vue 3 SFCs
│   ├── SuggestionItem.vue  # LaTeX autocomplete suggestion row
│   ├── ImageToMarkdown.vue # OCR result modal content
│   ├── LatexModal.vue      # LaTeX symbol browser modal content
│   └── ChangeCase.vue      # Case conversion modal content
└── main.ts                 # (already listed at top)
```

---

## Request Lifecycle Patterns

### Image Optimization (Local)

```
User pastes image → handleClipboardImage()
  → navigator.clipboard.read() → gets Blob
  → convertWrapper(blob)
    → convertImageLocally(blob, format, quality) — native browser canvas
    → randomFilename(ext) → fileManager.getAvailablePathForAttachment()
    → vault.createBinary() → returns file.path
  → insertContent(editor, filePath) → embeds ![[path]]
```

### Image Optimization (S3)

```
User invokes S3 command → handleClipboardImage(editor, view, true)
  → convertWrapper(blob, true)
    → convertImageLocally(blob, format, quality) — native canvas
    → slugifyVaultName(vault) + localPathToPartialUrl(path)
    → POST ${apiServer}/images/save_s3 (multipart/form-data)
    → returns S3 URL
  → insertContent() → embeds ![](s3_url)
```

### OCR / Image-to-Markdown

```
User invokes Markdownify → handleOCR(editor, extractText=false)
  → navigator.clipboard.read() → filter image/png
  → optimizeImageToWebP(blob) — resize to ≤1024×1024
  → POST ${apiServer}/images/ocr (multipart/form-data)
  → parse OCRResponse → shows ImageTextModal
  → user approves → convertWrapper() + insertContent(editor, ...)
```

### LLM Prompt Callouts

```
User writes > [!prompt] <uuid> in editor
  → LLM: Answer Prompts → handlePromptCallouts()
  → getPromptCallouts(app) — regex scan for all `> [!prompt] <uuid>` blocks
  → For each: POST ${apiServer}/text/generator
  → replacePromptCallout(app, uuid, result) — replaces callout with result
```

### Chinese Language Analysis

```
User selects text → Zhongwen submenu
  → zhongwenTasks(task, selectedText) — returns {prompt, system}
  → POST ${apiServer}/text/zhongwen
  → insertContent(editor, null, result, "to")
```

---

## Dependency Flow

```
Plugin (main.ts)
  ├── libs/utils.ts          (no internal deps)
  ├── libs/ocr-utils.ts      → utils.ts, plugin_interfaces.ts, axios
  ├── libs/contextmenu.ts    → prompt-parser.ts
  ├── libs/autosuggestions.ts→ latex_symbols/, vue, SuggestionItem.vue
  ├── libs/prompt-parser.ts  (no internal deps)
  ├── libs/zhongwen.ts       (no internal deps)
  ├── libs/plugin_interfaces.ts → zod
  ├── modals/*               → components/*.vue, vue
  ├── dict/                  → dictUI.vue, vue
  └── settings.ts            → plugin_interfaces.ts
```

Key rules:
- `libs/` files should NOT import from `main.ts` (avoids circular deps).
- `modals/` only import their corresponding `components/*` Vue SFCs + Obsidian's `Modal`.
- `latex_symbols/` are pure data files with zero dependencies.

---

## External API Endpoints

All endpoints are relative to `settings.apiServer` (default: `http://localhost:5764`).

| Endpoint | Method | Used By | Body | Response |
|---|---|---|---|---|
| `/images/transform_download` | POST | `convertWrapper` (AVIF route) | multipart (image, format_to, quality) | binary (arraybuffer) |
| `/images/transform_save_s3` | POST | `convertWrapper` (AVIF+S3 route) | multipart (image, format_to, quality, s3_path) | JSON `{success, result?: {url}}` |
| `/images/save_s3` | POST | `convertWrapper` (native+S3 route) | multipart (image, s3_path) | JSON `{success, result?: {url}}` |
| `/images/ocr` | POST | `ocr-utils.ts` | multipart (image as WEBP) | JSON `{success, result?: {text}}` |
| `/images/ocr-vision` | POST | `ocr-utils.ts` | multipart (image as PNG) | JSON `{success, result?: {text}}` |
| `/text/generator` | POST | Summarize, Prompt Callouts | JSON `{prompt, providedText, system}` | JSON `{success, result?: {text}}` |
| `/text/zhongwen` | POST | Chinese language analysis | JSON `{prompt, providedText, system}` | JSON `{success, result?: {text}}` |

All image upload endpoints use `multipart/form-data` (no JSON body). Text endpoints use `application/json`.

---

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Obsidian
        A[Editor] --> B[Plugin Commands]
        A --> C[Context Menu]
        A --> D[LatexSuggest]
    end

    subgraph Alapaki
        B --> E[handleClipboardImage]
        B --> F[handleOCR]
        B --> G[handleSummarize]
        B --> H[handleLatexModal]
        C --> I[handleChangeCase]
        C --> J[handleWrapCallout]
        C --> K[handleZhongwen]
        C --> L[handlePromptCallouts]
    end

    subgraph "UI Layer"
        E --> M[LoadingModal]
        F --> M
        G --> M
        F --> N[ImageTextModal]
        H --> O[LatexModal]
        I --> P[ChangeCaseModal]
    end

    subgraph "External API"
        E --> Q[${apiServer}/images/*]
        F --> R[${apiServer}/images/ocr*]
        G --> S[${apiServer}/text/generator]
        K --> T[${apiServer}/text/zhongwen]
        L --> S
    end

    Q --> U[Local File or S3 URL]
    R --> N
    S --> L[insert into editor]
    T --> L
    U --> L
```

---

## Conventions

1. **All async operations use a single `this.locked` boolean** — Set to `true` at start, `false` at end. Checked before any operation begins. This is a coarse lock; only one operation runs at a time.
2. **Vue modals follow a `openWithPromise()` pattern** — Returns a `Promise<callbackValue>` that resolves when the modal closes. The modal calls `insertData()` with the result before closing.
3. **Error handling is consistent**: `try/catch` → `console.error` → `new Notice()` with user-friendly message.
4. **All API calls go through `axios`** — No fetch API used. Endpoints use either `responseType: 'json'` or `responseType: 'arraybuffer'`.
5. **Zod is used for input validation** — See `stringOrEmptySchema` in `plugin_interfaces.ts`. Used in `insertContent()` to coerce both string and non-string values.

## Existing Abstractions

| Abstraction | Location | Reuse |
|---|---|---|
| `tUtils` static class | `src/libs/utils.ts` | Random filenames, URL validation, image conversion, clipboard checks, vault name slugging, path sanitization |
| `insertContent()` | `src/libs/ocr-utils.ts` | Handles both HTTP URLs and local `![[path]]` insertions |
| `callbackValue` | `src/modals/*.ts` | Consistent modal return type (`{textContent}` or `{textContent, includeImage}`) |
| `LoadingModal` | `src/modals/loading_modal.ts` | Generic loading spinner with customizable `status` text |

---

## Common Mistakes

1. **Using `isValidHttpUrl` for local paths** — That method returns `false` for vault-relative paths. Use string comparison instead.
2. **Forgetting to call `saveSettings()`** — After modifying `this.plugin.settings`, you must call `await this.plugin.saveSettings()`.
3. **Not cleaning up Vue apps in modal `onClose`** — Every Vue-based modal must call `.unmount()` and `.empty()` the content element. See `aiprompt_modal.ts` for the canonical pattern.
4. **Using the wrong endpoint for OCR** — `uploadToOCREndpoint` (WEBP, `/images/ocr`) vs `uploadToOCRVisionEndpoint` (PNG, `/images/ocr-vision`) produce different results. Confirm which pipeline you need.
5. **Lock contention** — `handlePromptCallouts()` loops through prompts inside a single lock. A long-running prompt blocks image operations.

---

## Risks

1. **No rate limiting** — If the user has many `> [!prompt]` callouts, they all fire concurrently.
2. **Clipboard image filtering** — Only `image/png` MIME type is accepted. Other formats (e.g. `image/jpeg`, `image/webp` from the clipboard) are silently skipped.
3. **S3 path injection risk** — `localPathToPartialUrl` now sanitises path-traversal sequences (`../`, `.`), but the S3 path is partially user-controlled via the vault name.
4. **No test suite** — Manual testing only. All refactoring risks regressions.
