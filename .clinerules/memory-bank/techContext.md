# Tech Context

## Technologies

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Language | TypeScript | ~5.9.2 | All plugin logic, strict mode enabled |
| UI Framework | Vue 3 (Composition API) | ^3.5.20 | Modal content, sidebar, autocomplete suggestions |
| State Management | Pinia | ^3.0.4 | Declared, not heavily used (settings via Obsidian) |
| Build | Vite | ^7.3.0 | Dev server + production bundling |
| Type Checker | vue-tsc | ^3.2.1 | Type checking with Vue template support |
| CSS | TailwindCSS | ^3.4.19 | Utility-first CSS for Vue components |
| Linter | ESLint | ^9.39.2 | Code quality with TypeScript + Vue plugins |
| HTTP Client | Axios | ^1.13.2 | All API calls |
| Schema | Zod | ^3.25.76 | Runtime input validation |
| Sanitization | DOMPurify | ^3.3.1 | HTML sanitization |
| LaTeX | KaTeX | ^0.16.27 | LaTeX rendering |
| Markdown | marked | ^17.0.1 | Markdown parsing |
| AI SDK | OpenAI SDK | ^5.23.2 | Declared, not directly used (goes through API server) |
| Plugin API | obsidian | ^1.8.7 | Obsidian plugin types |

## Development Setup

```bash
# Prerequisites: Node.js 18+, npm
npm install          # Install dependencies
npm run dev          # Start Vite dev server (hot-reload)
npm run build        # Full build with type-checking
npm run type-check   # Type-check only
npm run lint         # ESLint with auto-fix
```

### Config files

| File | Purpose |
|---|---|
| `tsconfig.json` | TypeScript config (strict, ESNext modules, bundler resolution) |
| `vite.config.ts` | Vite config with Vue plugin, static copy plugin |
| `tailwind.config.js` | TailwindCSS content paths |
| `postcss.config.js` | PostCSS with Tailwind plugin |
| `eslint.config.js` | Flat ESLint config |
| `version-bump.mjs` | Version increment script for releases |

## Technical Constraints

### Browser/Environment Constraints
- **Electron-only context**: `navigator.clipboard.read()` requires secure context (HTTPS or localhost). Works in Obsidian's Electron environment but fails in mobile/web.
- **Canvas-based image processing**: `canvas.toBlob()` supports WEBP, JPEG, PNG. AVIF is NOT supported by any browser. All formats except AVIF can be handled entirely in-browser.
- **No Node.js filesystem API**: `vault.createBinary()` is the only way to save files. Obsidian's Vault API abstracts the filesystem.
- **No native binary execution**: Cannot call `ffmpeg`, `cwebp`, or other binaries. Any such operation must go through the API server.

### API Server Dependencies
The plugin requires a separate backend running at `settings.apiServer` (default `http://localhost:5764`). Required endpoints:

| Endpoint | Required For |
|---|---|
| POST `/images/transform_download` | AVIF local conversion |
| POST `/images/transform_save_s3` | AVIF S3 conversion |
| POST `/images/save_s3` | Native format S3 upload |
| POST `/images/ocr` | Image-to-markdown OCR |
| POST `/images/ocr-vision` | Raw text extraction |
| POST `/text/generator` | Summarization + prompt callouts |
| POST `/text/zhongwen` | Chinese language analysis |

### Obsidian API Constraints
- **Commands**: Registered via `addCommand()` with unique IDs. No hotkey bindings in code (user-configurable via Obsidian settings).
- **Editor menu**: Registered via `workspace.on('editor-menu', ...)` event.
- **Editor suggest**: Registered via `registerEditorSuggest()`, integrated with CodeMirror's syntax tree.
- **Custom views**: Registered via `registerView()` with a unique `VIEW_TYPE` string.
- **Settings**: Loaded/saved via `loadData()`/`saveData()`. Settings tab extends `PluginSettingTab`.

## Dependencies

### Production (npm)
- `obsidian: ^1.8.7` — Plugin API types (required; Obsidian provides the runtime)
- `vue: ^3.5.20` — UI framework
- `pinia: ^3.0.4` — State management (available but not consistently used)
- `axios: ^1.13.2` — HTTP client
- `openai: ^5.23.2` — AI SDK (declared; most calls go through API server)
- `zod: ^3.25.76` — Schema validation
- `dompurify: ^3.3.1` — HTML sanitization
- `katex: ^0.16.27` — LaTeX rendering
- `marked: ^17.0.1` — Markdown parsing
- `tslib: ^2.8.1` — TypeScript runtime helpers
- `builtin-modules: ^5.0.0` — Node built-in module references

### Dev (npm)
- `vite: ^7.3.0` + `@vitejs/plugin-vue` + `@vitejs/plugin-vue-jsx`
- `vue-tsc: ^3.2.1`
- `typescript: ~5.9.2`
- `tailwindcss: ^3.4.19` + `@tailwindcss/postcss` + `autoprefixer` + `postcss`
- `eslint: ^9.39.2` + `eslint-plugin-vue` + `@typescript-eslint/*` + `@vue/eslint-config-typescript`
- `npm-run-all2: ^8.0.4` — Run npm scripts in parallel
- `vite-plugin-static-copy` — Copy static assets during build
- `vite-plugin-vue-devtools` — Vue devtools in dev mode

## Tool Usage Patterns

### Axios
- **Always set `responseType`** — `'json'` for text endpoints, `'arraybuffer'` for image downloads.
- **Image uploads**: Use `FormData` with `multipart/form-data` content type header.
- **Text endpoints**: Use JSON body with `{prompt, providedText, system}`.

### Error Handling
- All async operations: `try/catch` → `console.error` → `new Notice(userMessage)`.
- Response parsing: Always check `responseData.success === true` before accessing `result`.
- Fallback messages: Distinguish "OCR Error", "Text generation error", and unknown errors.

### Type Coercion
- `stringOrEmptySchema` (Zod) handles both string and number inputs for `insertContent()`.
- `@ts-expect-error` used in `settings.ts` for partial settings access where TS strictness conflicts with the dynamic nature of observed plugin properties.
