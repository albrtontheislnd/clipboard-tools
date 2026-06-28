# Product Context

## Why This Project Exists

Obsidian users who frequently paste images from the clipboard into their notes face several pain points:
- Images are pasted as large, uncompressed PNGs that bloat the vault.
- There is no built-in OCR capability to extract text from images.
- Writing LaTeX requires memorizing symbol names or switching to an external reference.
- Language learners need quick grammar/word lookups without leaving the editor.
- There's no built-in way to trigger custom LLM prompts from within notes.

Alapaki Tools consolidates these workflows into a single plugin with a consistent interface.

## Problems It Solves

| Problem | Solution |
|---|---|
| Large PNG clipboard images bloat vault storage | Auto-convert to WEBP/AVIF/JPEG with configurable compression |
| Need to extract text from images | Two OCR pipelines (markdown conversion and raw text extraction) |
| Manually summarizing selected text | One-click AI summarization via the API server |
| Remembering LaTeX symbol names | Inline autocomplete (\\trigger) and GUI symbol browser |
| Learning Chinese grammar/words | Four analysis modes (grammar, English/VI word usage, sentence breakdown) |
| Running custom LLM prompts on note content | `> [!prompt]` callout blocks with UUID tracking |
| Changing text case slowly | Quick case conversion modal with 7+ transformation modes |
| Accessing a dictionary while writing | Sidebar ItemView with Vue 3 dictionary component |

## How It Should Work

1. **Flow-first, menu-second**: The primary interaction is the right-click context menu → the submenu "Alapaki: More..." groups secondary actions. Primary actions (embed, markdownify, OCR) are top-level editor menu items and command palette entries.
2. **Minimal configuration**: Sensible defaults (AVIF format, 70% compression, `localhost:5764` API server, S3 enabled) let users start immediately.
3. **Modal-driven interaction**: All multi-step workflows (AI results, case conversion, LaTeX selection) use Obsidian modals with Vue 3 components.
4. **Non-blocking**: A loading modal shows progress during async operations. The global lock prevents conflicts.

## User Experience Goals

- A user should be able to paste an image, right-click, and in two clicks have an optimized WEBP embedded.
- A LaTeX user should type `\` inside a math block and immediately see filtered symbol suggestions.
- A language learner should select text, right-click → Alapaki More → Zhongwen → Grammar, and see an explanation inserted below.
- A power user should be able to pre-populate a note with `> [!prompt]` blocks, trigger "Answer Prompts", and have each block replaced with AI-generated content.
- All operations should provide clear error feedback via Obsidian Notices and gracefully handle unavailable APIs (no crashes).
