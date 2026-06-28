# LaTeX Support Module

## Purpose

The LaTeX Support module provides two complementary ways for users to insert LaTeX symbols into their Obsidian notes: an inline autocomplete trigger via `EditorSuggest` (activated by typing `\` inside a math block) and a full browsable modal (`InsertLatexModal`) for discovering and inserting symbols by category. It is designed to speed up mathematical note-taking without requiring the user to remember every LaTeX command.

## Scope

- **Inline autocomplete** (`LatexSuggest`): Suggests LaTeX symbol names when the cursor is inside a math block and the user types a backslash (`\`).
- **Modal symbol browser** (`InsertLatexModal`): A GUI overlay that lets users browse symbols by category (arrows, Greek, relations, etc.) and insert them.
- **Symbol data**: Categorised symbol definitions loaded from `src/latex_symbols/*.ts` files.
- **Vue 3 components**: `SuggestionItem.vue` renders each suggestion row in the autocomplete dropdown; `LatexModal.vue` renders the modal UI.
- **Debounced modal opening**: The modal uses `openWithPromise()` with a debounce guard to prevent rapid re-opens.

## Architecture / Flow

### Inline Autocomplete (`LatexSuggest`)

```
User types \ inside a math block
  └─ EditorSuggest.onTrigger(cursor, editor, ctx)
       └─ isInMath(editor, cursor) → true?
            └─ Return trigger at cursor position
  └─ EditorSuggest.getSuggestions(query)
       └─ Search symbolMap for matching symbol names
       └─ Return filtered Suggestion[] results
  └─ EditorSuggest.renderSuggestion(suggestion, el)
       └─ Mount SuggestionItem.vue component into el
  └─ EditorSuggest.selectSuggestion(suggestion)
       └─ Replace trigger text with full LaTeX command
```

1. `LatexSuggest` extends Obsidian's `EditorSuggest<SymbolSuggestion>`.
2. The `onTrigger` method checks if the cursor is inside a math block using the CodeMirror 6 syntax tree (`isInMath` utility).
3. If inside a math block and the character before the cursor is `\`, a trigger is returned at that position.
4. `getSuggestions` filters the `suggestionMap` (a `Map<string, SymbolSuggestion[]>`) — symbols are cached per query string to avoid repeated filtering.
5. `renderSuggestion` mounts a `SuggestionItem.vue` component to render each row (icon, symbol name, LaTeX command).
6. `selectSuggestion` replaces the trigger text with the selected symbol's LaTeX command.

### Modal Symbol Browser (`InsertLatexModal`)

```
User triggers the "Insert LaTeX Symbol" command
  └─ handleLatexModal()
       └─ new InsertLatexModal(app).openWithPromise()
            └─ Debounce guard: skip if opened < 500ms ago
            └─ Render LatexModal.vue with symbol categories
            └─ User selects a symbol → resolve promise with selection
       └─ Insert selected symbol at cursor position
```

1. The command handler creates a new `InsertLatexModal` instance and calls `openWithPromise()`.
2. A debounce mechanism prevents multiple modal opens within a short window (e.g., 500ms).
3. The modal's Vue component (`LatexModal.vue`) displays symbols grouped by category.
4. When the user selects a symbol, the promise resolves with the selected LaTeX command.
5. The command handler inserts the result at the current cursor position.

### Symbol Data Loading

```
src/latex_symbols/
  ├── arrows.ts
  ├── greek-hebrew.ts
  ├── relations.ts
  ├── ... (additional category files)
  └── index.ts (aggregates all categories)
       └── LatexSuggest loads all into suggestionMap on init
```

Each category file exports an array of `SymbolSuggestion` objects with at minimum a `name` (e.g., `\alpha`) and a `char` (the Unicode character). The `index.ts` file aggregates all categories into a single array that `LatexSuggest` loads into its `suggestionMap` on initialisation.

## Key Files

| File | Role |
|---|---|
| `src/libs/autosuggestions.ts` | `LatexSuggest` class — inline autocomplete logic |
| `src/modals/latex_modal.ts` | `InsertLatexModal` — modal symbol browser |
| `src/latex_symbols/*.ts` | Symbol data organised by category (arrows, greek/hebrew, relations, etc.) |
| `src/main.ts` | Command handlers: `handleLatexModal`, `latexSuggest` registration |
| `src/components/SuggestionItem.vue` | Vue 3 SFC — renders individual suggestion rows |
| `src/components/LatexModal.vue` | Vue 3 SFC — renders the modal UI |

## API Endpoints

None. The LaTeX module is fully client-side — all symbol data is bundled in the plugin source files.

## Conventions

- **Trigger character**: Only backslash (`\`) triggers autocomplete suggestions.
- **Math block detection**: `isInMath` uses the CodeMirror 6 syntax tree to determine if the cursor is inside a math block (inline `$...$`, display `$$...$$`, or `\\(...\\)` / `\\[...\\]`).
- **Suggestion caching**: Queries are cached via `suggestionMap` — once a query string has been computed, the same result is returned on subsequent keystrokes until the trigger context changes.
- **Symbol file organisation**: Each category file exports an array; `index.ts` re-exports a merged array. Adding a new category requires creating a new file and updating the index.
- **Vue component mounting**: `SuggestionItem.vue` is mounted manually using Vue's `createApp` and `mount` APIs (not through Obsidian's built-in component system). The component is unmounted when the suggestion list is cleared.
- **Debounce guard**: The modal uses a timestamp-based debounce (e.g., `Date.now() - lastOpened > 500`) to prevent rapid re-opens from accidental double-triggers.

## Common Mistakes

1. **Autocomplete not triggering**: The most common issue is the cursor not being inside a recognised math block. `isInMath` checks the CodeMirror syntax tree — if the editor's language mode doesn't mark math regions properly, the trigger won't fire. Check that the note uses an Obsidian math syntax (`$...$`, `$$...$$`).
2. **Trigger character collision**: If another plugin also registers an `EditorSuggest` for `\`, there may be conflicts. The `onTrigger` return value determines priority — returning `null` passes control to the next plugin.
3. **Missing symbol data**: If `src/latex_symbols/index.ts` doesn't import a category file, those symbols won't appear. Always update the index when adding a new category.
4. **Vue component lifecycle**: `SuggestionItem.vue` is mounted/unmounted manually. If the component is not properly unmounted (e.g., on error), Vue instances may leak. Always call `app.unmount()` in the cleanup path.
5. **Modal promise never resolves**: If the user closes the modal without selecting a symbol (e.g., pressing Escape), the promise from `openWithPromise()` may remain pending. Ensure the `onClose` handler rejects or resolves the promise with `null`.
6. **Debounce too aggressive**: If the debounce window is too long (e.g., >1000ms), users may perceive the modal as unresponsive. Balance against accidental double-triggers.
7. **Special characters in symbol names**: Some LaTeX commands (e.g., `\^`, `\_`) contain characters that are significant in Obsidian or Markdown. Ensure the inserted text is properly escaped for the editor context.
