# Active Context

## Current Work Focus

Documentation overhaul — the `docs/` directory was created from scratch (14 files) to provide comprehensive developer and AI agent documentation. The `.clinerules/memory-bank/` was initialized in the same session.

## Recent Changes (this session)

### docs/ directory created (14 files)

| File | Purpose |
|---|---|
| `docs/README.md` | Master index with tech inventory, doc map, cross-refs |
| `docs/architecture.md` | System design, request lifecycles, Mermaid diagrams, API endpoints |
| `docs/engineering.md` | Build, conventions, edge cases, tech debt |
| `docs/ai/agent-guide.md` | AI agent extension patterns, DO/DON'T, risk areas |
| `docs/modules/image-processing.md` | convertWrapper 4-branch pipeline |
| `docs/modules/ocr-ai.md` | OCR pipelines, text summarizer, modals |
| `docs/modules/latex.md` | LatexSuggest autocomplete, InsertLatexModal |
| `docs/modules/chinese-tools.md` | zhongwenTasks 4-task system |
| `docs/modules/prompt-callouts.md` | Prompt callout insert/get/replace/append |
| `docs/modules/text-tools.md` | Change case + wrap callout |
| `docs/modules/dictionary.md` | DictionaryView (ItemView + Vue 3) |
| `docs/reference/utils.md` | Full tUtils API reference |
| `docs/reference/commands.md` | All commands, menus, context items |
| `docs/reference/config.md` | Settings interface, defaults, UI |

### .clinerules/memory-bank/ initialized (this sub-session)

| File | Purpose |
|---|---|
| `projectbrief.md` | Core requirements, goals, scope |
| `productContext.md` | Why, problems solved, UX goals |
| `systemPatterns.md` | Architecture, design patterns, component relationships |
| `techContext.md` | Technologies, setup, constraints, dependencies |
| `activeContext.md` | This file — current focus, recent changes, next steps |
| `progress.md` | What works, what's left, known issues |

### Recent git diff (before this session)

- `src/libs/utils.ts`: `localPathToPartialUrl` — added `defName` parameter (default `'uploads'`) and path-traversal guards (checks for `.`, `../`, `/../` → falls back to `defName`)

## Active Decisions

| Decision | Status | Rationale |
|---|---|---|
| docs/ covers developer needs, MB covers continuity | Implemented | Separate concerns — docs/ is project knowledge, MB is agent memory |
| AGENTS.md at root preserved and cross-linked | Done | Human-written workflow guidance should not be overwritten |
| Single `localPathToPartialUrl` fallback | Done | Prevents S3 path injection; backward-compatible default |

## Next Steps

1. **Test the build** — Run `npm run build` and `npm run lint` to confirm all docs changes don't break the code.
2. **Consider adding a test framework** — No tests exist. Vitest would fit the Vite setup naturally.
3. **Tech debt**: Remove unused `openai` SDK import if confirmed unused. Resolve `@ts-expect-error` suppressions in `settings.ts`.

## Important Patterns & Preferences

- **Documentation-first**: docs/README.md is the entry point. All new docs should be linked there.
- **Delegation pattern for large doc tasks**: Use `delegate_task` with `tasks` array when creating 3+ docs in parallel.
- **Verification after delegation**: Always `read_file` the actual output — subagent summaries are self-reported.
- **Cross-ref sweep**: After any rename/remove of packages, scripts, or config keys, grep docs/ for stale references.

## Learnings & Project Insights

1. The plugin's API server (not the plugin itself) does all heavy processing. The plugin is essentially a thin client + UI.
2. `localPathToPartialUrl` was the only changed file — the recent diff is small, suggesting the plugin is in maintenance mode.
3. LaTeX symbol data is organized by mathematical category in `src/latex_symbols/` — adding new symbols there is entirely safe (pure data, no logic).
4. The single global lock (`this.locked`) means `handlePromptCallouts()` blocks all other operations while iterating prompts — this is a scalability concern for users with many prompt callouts.
5. Obsidian plugin settings use `Partial<Settings>` typing by convention, leading to `@ts-expect-error` suppressions in settings.ts when accessing properties that may be undefined.
