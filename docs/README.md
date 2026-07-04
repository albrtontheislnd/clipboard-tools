# Alapaki Tools — Documentation Index

> **Plugin name**: `alapaki-tools`  
> **Display name**: Clipboard Tools: Optimizer & Conversion  
> **Type**: Obsidian Community Plugin  
> **Version**: 1.0.0  
> **License**: MIT  

Alapaki Tools is a multi-feature Obsidian plugin that provides image optimization, OCR, AI-powered text operations, LaTeX authoring support, Chinese language analysis, and a dictionary sidebar — all within the Obsidian editor.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Obsidian Plugin API                    │
│  Plugin.onload() → initializePlugin() → register all     │
└──────────┬──────────────────────────────┬────────────────┘
           │                              │
     ┌─────▼──────┐              ┌───────▼────────┐
     │  Commands  │              │ Context Menu   │
     │  (8 cmds)  │              │ (submenu ~12)  │
     └─────┬──────┘              └───────┬────────┘
           │                              │
           └──────────┬──────────────────┘
                      ▼
           ┌─────────────────────┐
           │  Handle Methods     │
           │  (main.ts)          │
           └──┬────────────────┬─┘
              │                │
     ┌────────▼───┐    ┌──────▼─────────┐
     │ Image Ops  │    │  Text Ops      │
     │ convertWr. │    │  summarize     │
     │ handleClip.│    │  changeCase    │
     │ handleOCR  │    │  wrapCallout   │
     │ handleLatex│    │  zhongwen      │
     │ S3 upload  │    │  promptCallout │
     └─────┬──────┘    └──────┬─────────┘
           │                  │
     ┌─────▼──────────┐      │
     │ External APIs   │      │
     │ /images/...     │      │
     │ /text/...       │      │
     └────────────────┘      │
                              │
     ┌────────────────────────▼──────────┐
     │  Sidebar Views & Editors          │
     │  DictionaryView (Vue 3)           │
     │  LatexSuggest (CodeMirror)        │
     └───────────────────────────────────┘
```

---

## Technology Inventory

| Category | Technology | Purpose |
|---|---|---|
| Language | TypeScript 5.9 (strict) | All plugin logic |
| Framework | Vue 3 (Composition API) | Modal & sidebar UI |
| State | Pinia 3 | (available, not heavily used yet) |
| Build | Vite 7 + vue-tsc 3 | Dev server & prod builds |
| Styling | TailwindCSS 4 + PostCSS | UI components |
| Lint | ESLint 9 + typescript-eslint | Code quality |
| HTTP | Axios | API calls (image transform, OCR, text gen) |
| AI SDK | OpenAI SDK (v5) | AI-powered features |
| Schema | Zod | Input validation |
| Helpers | DOMPurify, KaTeX, marked | Sanitization & rendering |
| Packaging | obsidian 1.8.7 types | Plugin API |

---

## Documentation Map

||| Document | Audience | Covers |
|||---|---|---|
||| `README.md` (this) | All | Project overview, architecture, index |
||| [architecture.md](architecture.md) | Developers | System design, data flow, module boundaries |
||| [modules/image-processing.md](modules/image-processing.md) | Developers | Image optimization pipeline, local/S3/server flows |
||| [modules/ocr-ai.md](modules/ocr-ai.md) | Developers | OCR, image-to-markdown, text extraction |
||| [modules/latex.md](modules/latex.md) | Developers | LaTeX autocomplete, symbol insertion |
||| [modules/chinese-tools.md](modules/chinese-tools.md) | Developers | Zhongwen grammar/usage/explain system |
||| [modules/prompt-callouts.md](modules/prompt-callouts.md) | Developers | LLM prompt callout system |
||| [modules/text-tools.md](modules/text-tools.md) | Developers | Change case, wrap callout |
||| [modules/local-file.md](modules/local-file.md) | Developers | Local file insertion (Markdown links to local files) |
||| [modules/dictionary.md](modules/dictionary.md) | Developers | Dictionary sidebar (Vue 3 + API) |
||| [reference/utils.md](reference/utils.md) | Developers | tUtils API reference |
||| [reference/commands.md](reference/commands.md) | Developers | All commands, menus, context items |
||| [reference/config.md](reference/config.md) | Developers | Settings schema and defaults |
||| [ai/agent-guide.md](ai/agent-guide.md) | AI Agents | Extension patterns, conventions, risks |
||| [engineering.md](engineering.md) | Developers | Build, lint, project structure, conventions |
||| [inline_webworker_example.md](inline_webworker_example.md) | Developers | Example of inlining web workers with Vite |

---

## Quick-Start for Developers

```bash
# Install
npm install

# Development (hot-reload)
npm run dev

# Build (with type-checking)
npm run build

# Type-check only
npm run type-check

# Lint
npm run lint
```

---

## Important Entry Points

| File | Role |
|---|---|
| `src/main.ts` | Plugin class, all handle methods, command/menu registration |
| `src/settings.ts` | Settings tab UI, default values |
| `src/libs/utils.ts` | `tUtils` static utility class |
| `src/libs/ocr-utils.ts` | OCR + image-to-markdown pipeline |
| `src/libs/contextmenu.ts` | Right-click context submenu |
| `src/libs/prompt-parser.ts` | LLM callout insert/get/replace/append |
| `src/libs/autosuggestions.ts` | LaTeX autocomplete in math blocks |
| `src/libs/zhongwen.ts` | Chinese language analysis prompts |
| `src/dict/dictUI.ts` | Dictionary sidebar (Vue 3 + ItemView) |
| `src/modals/*` | Vue 3 modals (AI, LaTeX, ChangeCase, Loading) |

---
## Cross-References

- **[Root README](../README.md)** — User-facing installation and usage guide
- **[AGENTS.md](../AGENTS.md)** — AI coding agent workflow guidance

---

## Architectural Warnings

1. **AVIF requires external binaries** — AVIF conversion routes through the API server (`/images/transform_download`); it is NOT handled client-side.
2. **S3 uploads require an API server** — The plugin delegates S3 uploads to a backend at `apiServer:port/images/save_s3`. No direct AWS SDK usage in the plugin.
3. **Single global lock** — `this.locked` gates all async operations. Long-running tasks block all other features.
4. **Clipboard API requires HTTPS** — `navigator.clipboard.read()` only works in secure contexts (HTTPS or localhost). Obsidian's Electron environment qualifies, but code may fail in other renderers.
5. **Vue modals bypass Obsidian's lifecycle** — Vue apps are created/mounted manually inside modal containers. Cleanup in `onClose` is critical to prevent memory leaks.