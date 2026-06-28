# Progress

## What Works

### Image Processing
- [x] Clipboard image paste → convert to WEBP/JPEG/PNG via native browser canvas
- [x] AVIF conversion via API server (`/images/transform_download`)
- [x] S3 upload via API server (`/images/save_s3` and `/images/transform_save_s3`)
- [x] Local vault save via `vault.createBinary()`
- [x] Random filename generation (`tUtils.randomFilename`)
- [x] Path sanitization for S3 (`tUtils.localPathToPartialUrl` with traversal guards)
- [x] Vault name slugification (`tUtils.slugifyVaultName`)
- [x] Configurable format and compression (settings tab)

### OCR & AI
- [x] Image-to-markdown conversion (`convertImageToMarkdown` → `/images/ocr`)
- [x] Raw text extraction (`extractTextFromImage` → `/images/ocr-vision`)
- [x] Text summarization (`handleSummarize` → `/text/generator`)
- [x] ImageTextModal for reviewing/confirming OCR results
- [x] LoadingModal for async operation feedback
- [x] Content insertion (`insertContent`) handling both HTTP URLs and local `![[path]]`

### LaTeX Authoring
- [x] Inline autocomplete via `LatexSuggest` — triggers on `\` inside math blocks
- [x] Symbol data organized by 9+ mathematical categories
- [x] Vue-powered suggestion rendering (`SuggestionItem.vue`)
- [x] Symbol browser modal (`InsertLatexModal`) with debounce
- [x] Empty-state fallback for missing/empty settings

### Chinese Language Tools
- [x] Grammar explanation (English)
- [x] Word usage lookup (English and Vietnamese)
- [x] Sentence breakdown with key grammar explanation
- [x] Context-menu integration under "Alapaki: More..."

### Text Utilities
- [x] Change case modal (7+ transformation modes via Vue component)
- [x] Wrap text as `> [!info]` callout
- [x] Prevent double-wrapping (detects existing callouts)

### Prompt Callouts
- [x] Insert `> [!prompt] <UUID>` callout at cursor
- [x] Scan editor for all top-level prompt callouts
- [x] Replace callout with AI-generated content
- [x] Append text to existing callout (error messages)
- [x] UUID generation (standard v4 format)

### Dictionary Sidebar
- [x] Custom ItemView registered with unique VIEW_TYPE
- [x] Vue 3 component mounted inside sidebar
- [x] Single-instance leaf reuse
- [x] Ribbon icon + command to open

### General
- [x] Settings tab with dropdown, slider, text input, toggle
- [x] Editor menu (6 items)
- [x] Right-click context submenu (8 items under "Alapaki: More...")
- [x] Global async lock preventing concurrent operations
- [x] ESLint configuration
- [x] Vite hot-reload dev server

## What's Left to Build

### Known Gaps
- [ ] No unit tests or integration tests
- [ ] No mobile support (clipboard API limitations)
- [ ] No hotkey bindings in code (user-configurable only)
- [ ] No image format detection (all clipboard images assumed PNG)
- [ ] No progress indicator for individual operations within batches

### Features Under Consideration
- [ ] Support for JPEG/WEBP clipboard types (currently only image/png)
- [ ] Per-feature locks instead of single global lock
- [ ] Inline image preview before conversion
- [ ] Batch prompt callout cancellation support
- [ ] Caching layer for OCR results
- [ ] Direct S3 upload using AWS SDK (remove API server dependency)

## Current Status

**Phase**: Maintenance / Documentation
**Version**: 1.0.0
**Branch**: `dev-v2`

The plugin is functionally complete for its current feature set. The recent documentation effort (this session) created both developer docs (`docs/`) and a memory bank (`docs/.clinerules/memory-bank/`) to serve future development.

## Known Issues

| Issue | Severity | Status |
|---|---|---|
| Only `image/png` clipboard type accepted — JPEG/WEBP silently skipped | Medium | Acknowledged |
| Single global lock blocks all operations during long tasks | Medium | Acknowledged |
| AVIF requires external API server | Low | By design (browser limitation) |
| S3 requires external API server | Low | By design (no AWS SDK in plugin) |
| `@ts-expect-error` suppressions in settings.ts | Low | Tech debt — partial settings typing |
| `openai` SDK declared but not directly used | Low | Tech debt — possibly unused dependency |
| Prompt callout regex may be slow on very large documents | Low | Acknowledged |
| No test framework | Medium | Blocked on setup effort |

## Evolution of Project Decisions

| Decision | Date | Context |
|---|---|---|
| API server delegation for heavy processing | Initial | Browser limitations make AVIF/S3/OCR impossible in-plugin |
| Vue 3 for modal UIs | Initial | Complex UIs need reactive framework |
| Single global lock | Initial | Simple, prevents clipboard state corruption |
| Regex-based callout parsing | Initial | Leverages standard Obsidian callout syntax |
| `localPathToPartialUrl` safety guard | This session | Added `defName` + path-traversal checks after S3 injection concern |
| Full `docs/` documentation | This session | No developer docs existed — needed for maintenance and AI agent onboarding |
| Memory Bank initialization | This session | Needed for agent session continuity across resets |
