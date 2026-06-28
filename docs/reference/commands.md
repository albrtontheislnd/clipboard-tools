# Commands & Menus Reference

> **Source:** `src/main.ts`, `src/libs/contextmenu.ts`

This document describes all registered commands, editor-menu items, and context-submenu items for the Alapaki Tools (Clipboard Tools: Optimizer & Conversion) plugin.

---

## Registered Commands

Registered via `this.addCommand()` in `ImgWebpOptimizerPlugin.initializePlugin()`.

| ID                    | Name                                                  | Key Binding | Description                                                               |
|-----------------------|-------------------------------------------------------|-------------|---------------------------------------------------------------------------|
| `paste-optimized-img` | Embed clipboard image in WEBP/AVIF/PNG/JPEG format    | *(none)*    | Reads an image from clipboard, converts to configured format, inserts as attachment |
| `s3-optimized-img`    | Optimize and save to S3 Storage                       | *(none)*    | Converts clipboard image and uploads to S3, inserts remote URL into editor |
| `ai-convert-md`       | Convert clipboard image to Markdown/Latex             | *(none)*    | OCRs clipboard image, shows result in a modal for review before inserting  |
| `extract-text-image`  | Extract text from Image                               | *(none)*    | OCRs clipboard image for raw text extraction via `/images/ocr-vision` |
| `extract-text-image-quick` | Quick Extract text from Image                    | *(none)*    | Fast text extraction via Apple Vision Framework (`/images/ocr-quick`) |
| `open-dictionary-view`| Open Alapaki Dictionary                               | *(none)*    | Opens the Alapaki Dictionary custom view in the right sidebar              |

> **Note:** No commands currently have keyboard shortcuts assigned. Users can bind them in Obsidian's Hotkeys settings.

### Command Details

#### `paste-optimized-img`
- **Handler:** `handleClipboardImage(editor, view, false)`
- **Workflow:** Reads clipboard for PNG images → converts via `convertWrapper()` → saves to vault attachments → inserts `![[file]]` into editor
- **Format:** Uses the configured `imageFormat` setting (AVIF by default). For WEBP/JPEG/PNG, conversion is done locally via canvas API. For AVIF, the remote API server is used.

#### `s3-optimized-img`
- **Handler:** `handleClipboardImage(editor, view, true)`
- **Workflow:** Reads clipboard for PNG images → converts locally → uploads to S3 via `POST /images/save_s3` (for WEBP/JPEG/PNG) or `POST /images/transform_save_s3` (for AVIF) → inserts `![](s3-url)` into editor
- **S3 path:** `{slugifiedVaultName}/{localPathToPartialUrl(vaultDir)}/{randomFilename}`

#### `ai-convert-md`
- **Handler:** `handleOCR(editor, 'markdown')`
- **Workflow:** Reads clipboard for PNG images → optimizes to WEBP (≤1024×1024) → sends to `{apiServer}/images/ocr` → returns Markdown/LaTeX → shows in `ImageTextModal` → user can include the image or just the text

#### `extract-text-image`
- **Handler:** `handleOCR(editor, 'extract-text')`
- **Workflow:** Reads clipboard for PNG images → sends raw PNG to `{apiServer}/images/ocr-vision` → returns plain text → shows in `ImageTextModal` → user can include the image or just the text

#### `extract-text-image-quick`
- **Handler:** `handleOCR(editor, 'quick-extract')`
- **Workflow:** Reads clipboard for PNG images → sends raw PNG to `{apiServer}/images/ocr-quick` (Apple Vision Framework) → returns plain text → shows in `ImageTextModal` → user can include the image or just the text

#### `open-dictionary-view`
- **Handler:** `activateDictionaryView()`
- **Workflow:** Creates or reveals a `DictionaryView` leaf in the right sidebar
- **Ribbon icon:** Also accessible via the `book-a` ribbon icon

---

## Editor Menu Items

Registered via the `editor-menu` workspace event in `initializePlugin()`. These items appear in the right-click context menu when editing a Markdown file.

| Title (as shown in menu)                         | Icon              | Handler                                      | Description                                    |
|--------------------------------------------------|-------------------|----------------------------------------------|------------------------------------------------|
| `Alapaki: Embed ({FORMAT})`                      | `image-plus`      | `handleClipboardImage(editor, view, false)`  | Same as `paste-optimized-img` command          |
| `Alapaki: Save to S3 ({FORMAT})`                 | `image-plus`      | `handleClipboardImage(editor, view, useS3)`  | Same as `s3-optimized-img` command             |
| `Alapaki: Markdownify`                           | `brain-circuit`   | `handleOCR(editor, 'markdown')`              | Same as `ai-convert-md` command                |
| `Alapaki: OCR`                                   | `brain-circuit`   | `handleOCR(editor, 'extract-text')`          | Same as `extract-text-image` command           |
| `Alapaki: Quick OCR`                             | `brain-circuit`   | `handleOCR(editor, 'quick-extract')`         | Same as `extract-text-image-quick` command     |
| `Alapaki: Summarize`                             | `clipboard-pen-line` | `handleSummarize(editor)`                 | Summarizes selected text via `{apiServer}/text/generator` |

> **Note:** `{FORMAT}` is dynamically replaced with the current `imageFormat` setting value in uppercase (e.g. `AVIF`, `WEBP`).

---

## Context Submenu

Registered via `registerContextMenu()` in `src/libs/contextmenu.ts`. This appears as a nested submenu under **"Alapaki: More..."** in the editor context menu.

| Menu Item Title              | Icon              | Handler Call                                   | Description                                          |
|------------------------------|-------------------|------------------------------------------------|------------------------------------------------------|
| **Alapaki: More...**         | `pencil`          | *(submenu container)*                          | Parent submenu entry                                 |
| └── Change Case              | `case-sensitive`  | `handleChangeCase(editor)`                     | Opens `ChangeCaseModal` to transform selected text   |
| └── Wrap as Callout          | `wrap-text`       | `handleWrapCallout(editor, view)`              | Wraps selection in a `> [!info]` callout block       |
| └── Latex Symbols            | `clipboard-pen-line` | `handleLatexModal(editor)`                  | Opens `InsertLatexModal` to insert LaTeX symbols at cursor |
| └── *(separator)*            |                   |                                                |                                                      |
| └── LLM: New Prompt          | `wrap-text`       | `insertPromptCallout(editor)`                  | Inserts a new prompt callout block at cursor         |
| └── LLM: Answer Prompts      | `sparkles`        | `handlePromptCallouts()`                       | Sends all prompt callouts to API, replaces with responses |
| └── *(separator)*            |                   |                                                |                                                      |
| └── Zhongwen: Grammar        | `book`            | `handleZhongwen(editor, 'grammar')`            | Analyzes selected Chinese text grammar               |
| └── Zhongwen: Word Usage (EN)| `book-open`       | `handleZhongwen(editor, 'word-usage-en')`      | Chinese word usage explanation in English            |
| └── Zhongwen: Word Usage (VI)| `book-open`       | `handleZhongwen(editor, 'word-usage-vi')`      | Chinese word usage explanation in Vietnamese         |
| └── Zhongwen: Explain        | `info`            | `handleZhongwen(editor, 'explain')`            | General explanation of selected Chinese text         |

### Submenu Handler Details

- **Change Case** — Opens a modal with case transformation options (UPPER, lower, Title Case, etc.). Requires selected text.
- **Wrap as Callout** — Wraps the selected text in an Obsidian `> [!info]` callout. Does nothing if selection is already a callout or if no text is selected.
- **Latex Symbols** — Opens the `InsertLatexModal` to browse and insert LaTeX symbols at the cursor position.
- **LLM: New Prompt** — Inserts a formatted prompt callout block at the cursor position (via `insertPromptCallout`).
- **LLM: Answer Prompts** — Scans the document for all prompt callouts, sends each to `{apiServer}/text/generator`, and replaces each with the AI response.
- **Zhongwen tasks** — All four use the `{apiServer}/text/zhongwen` endpoint with task-specific prompts generated by `zhongwenTasks()`.

---

## Additional Registered Components

### `LatexSuggest` (Editor Suggest)

```typescript
this.latexSuggest = new LatexSuggest(this.app, this);
this.registerEditorSuggest(this.latexSuggest);
```

Registered as an `EditorSuggest` provider (not a command). Provides autocomplete suggestions for LaTeX symbols while typing in the editor. Source: `src/libs/autosuggestions.ts`.

### `DictionaryView` (Custom View)

```typescript
this.registerView(VIEW_TYPE_DICTIONARY, (leaf) => new DictionaryView(leaf, this));
```

Registered as a custom leaf view type with key `VIEW_TYPE_DICTIONARY`. Renders the Alapaki Dictionary UI. Accessed via:
- The `open-dictionary-view` command
- The `book-a` ribbon icon