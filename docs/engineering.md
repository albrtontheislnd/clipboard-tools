# Engineering

> **Related**: [docs/README.md](README.md) | [AGENTS.md](../AGENTS.md)

---

## Build System

| Command | Action |
|---|---|
| `npm run dev` | Start Vite dev server with hot-reload |
| `npm run build` | Full production build (type-check + Vite build) |
| `npm run build-only` | Build without type-checking |
| `npm run build:watch` | Watch mode for iterative development |
| `npm run type-check` | Run `vue-tsc --build --force` |
| `npm run lint` | ESLint with auto-fix across all source files |
| `npm run preview` | Preview built output |

Bundler: **Vite 7** with `@vitejs/plugin-vue` and `@vitejs/plugin-vue-jsx`.  
TypeScript: `~5.9.2` with strict mode enabled.

### Build Output

```
alapaki-tools/
├── main.js          # Concatenated plugin code
├── styles.css       # Combined styles (Tailwind + custom)
├── manifest.json    # Plugin manifest
└── dist/            # Vite output dir
```

---

## Project Structure Conventions

```
src/
├── main.ts              # Plugin class — single entry point
├── settings.ts          # Settings tab — separate from main
├── modals/              # Obsidian Modal wrappers (one per feature)
├── components/          # Vue 3 SFCs (one per modal view)
├── dict/                # Custom ItemView + Vue component
├── latex_symbols/       # Pure data files — no logic
├── libs/                # Utility & service modules — no UI
└── vite-env.d.ts       # Vite/Vue type shims
```

Rules:
- **No circular imports between `libs/` and `main.ts`** — `libs/` should never import `main.ts`.
- **One class per file** — The plugin class lives in `main.ts`, each modal in its own file.
- **Vue components go in `components/`** — Not in `modals/`.
- **Symbol data goes in `latex_symbols/`** — Each category file exports an array of `{latex, display, Unicode}` objects.
- **Static utility methods belong to the `tUtils` class** in `utils.ts` — Do not create new utility classes.

---

## Coding Conventions

### Naming

| Entity | Convention | Example |
|---|---|---|
| Variables / functions | camelCase | `handleOCR`, `convertWrapper` |
| Classes / types | PascalCase | `ImgWebpOptimizerPlugin`, `LatexSuggest` |
| Constants | UPPER_CASE | `VIEW_TYPE_DICTIONARY`, `ConfigValues` |
| Files | kebab-case.ts | `ocr-utils.ts`, `plugin-interfaces.ts` |
| Vue components | PascalCase.vue | `SuggestionItem.vue`, `ImageToMarkdown.vue` |
| Private members | Prefix with `_` | `_view`, `_file` |

### Imports

```typescript
// Built-in / Obsidian first
import { Plugin, Notice, Modal } from 'obsidian';
import * as path from 'path';

// External libraries
import axios from 'axios';
import { createApp } from 'vue';

// Internal — use path alias
import { tUtils } from './libs/utils';
import { ImageTextModal } from './modals/aiprompt_modal';
```

### TypeScript

- **Strict mode** — `strictNullChecks`, `noImplicitAny`, etc. all enabled.
- **Avoid `any`** — Use proper types. When working with Obsidian's dynamic API, suppress with `@ts-expect-error` and document why.
- **Interfaces** — Prefer `interface` for object shapes (e.g. `ImgOptimizerPluginSettings`).
- **Zod schemas** — Use for runtime coercion (see `stringOrEmptySchema`).

### Error Handling Pattern

```typescript
try {
    // operation
} catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Description:', error);
    new Notice(`User-friendly message: ${errorMessage}`);
    return null;  // or appropriate fallback
}
```

### Async Lock Pattern

```typescript
if (this.locked) {
    new Notice('Operation in progress...');
    return;
}
this.locked = true;
try {
    // async work
} finally {
    this.locked = false;
}
```

---

## Edge Cases and Gotchas

### Clipboard API

- `navigator.clipboard.read()` requires user interaction (transient activation). It works in Obsidian's Electron context but may fail in mobile or web versions of Obsidian.
- Only `image/png` MIME type from the clipboard is accepted. JPEG or WEBP images on the clipboard are silently skipped.

### Image Conversion

- Native browser conversion (canvas `toBlob`) supports: WEBP, JPEG, PNG.
- AVIF conversion requires the API server (`/images/transform_download`).
- The local conversion resizes to max 1024×1024. The API server conversion does not.
- Quality values are clamped to 1–100 internally.

### S3 Upload

- The S3 path is constructed as `{slugified-vault-name}/{local-path-partial}/{random-filename}`.
- `localPathToPartialUrl()` now sanitizes `../` and `.` path sequences. If the path is unsafe, it falls back to the `defName` parameter (default: `'uploads'`).
- The plugin does NOT use the AWS SDK directly — all S3 operations go through the backend API server.

### Prompt Callouts

- Only **top-level** callouts (`> [!prompt]`) are detected. Nested blockquotes (`>> ...`) are ignored.
- UUIDs must match the standard 8-4-4-4-12 format to be recognised.
- Regex-based scanning of the entire editor value can be slow on very large documents.

### Vue Memory Management

Every modal that creates a Vue app MUST clean up in its close path:

```typescript
onClose() {
    this.vueApp?.unmount();
    this.vueApp = null;
    this.contentEl.empty();
}
```

---

## Dependencies

### Production

| Package | Version | Purpose |
|---|---|---|
| obsidian | ^1.8.7 | Plugin API types |
| vue | ^3.5.20 | UI framework for modals and sidebar |
| pinia | ^3.0.4 | State management |
| axios | ^1.13.2 | HTTP client for API calls |
| openai | ^5.23.2 | AI SDK (declared but not heavily used) |
| zod | ^3.25.76 | Runtime schema validation |
| dompurify | ^3.3.1 | HTML sanitization |
| katex | ^0.16.27 | LaTeX rendering |
| marked | ^17.0.1 | Markdown parsing |
| tslib | ^2.8.1 | TypeScript helpers |
| builtin-modules | ^5.0.0 | Node.js built-in module references |

### Dev

| Package | Version | Purpose |
|---|---|---|
| vite | ^7.3.0 | Bundler |
| vue-tsc | ^3.2.1 | Vue type checker |
| typescript | ~5.9.2 | Language |
| tailwindcss | ^3.4.19 | Utility CSS |
| @tailwindcss/postcss | ^4.1.18 | PostCSS plugin for Tailwind |
| eslint | ^9.39.2 | Linter |
| eslint-plugin-vue | ^10.6.2 | Vue lint rules |
| @typescript-eslint/* | ^8.50.1 | TypeScript lint rules |

---

## Tech Debt / Cleanup Opportunities

1. **`@ts-expect-error` suppression comments** — Present in `settings.ts` for property access on partial settings. Should be resolved with proper optional chaining.
2. **`openai` SDK imported but minimally used** — The plugin calls a custom API server (`apiServer`), not OpenAI directly. The SDK dependency may be unused.
3. **`pinia` is declared but not consistently used** — Most state is stored in `plugin.settings` via Obsidian's `loadData`/`saveData`.
4. **No test framework** — Manual testing only. Vitest would fit the existing Vite setup naturally.
5. **`locked` is a coarse mutex** — One async operation blocks all others. A per-feature lock would be more flexible.