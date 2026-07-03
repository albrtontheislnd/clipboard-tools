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

## New Additions
- **Math Delimiter Normalization**: Added `tUtils.normalizeMathDelimiters()` in `utils.ts` to handle LaTeX math formatting in LLM outputs. This ensures proper rendering of `$...$` and `$$...$$` in Obsidian notes.

(File has 111 lines total.)