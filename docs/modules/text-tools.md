# Text Tools

## Purpose

The Text Tools module provides two utility features for transforming selected text in the Obsidian editor: **Change Case** (apply various case transformations) and **Wrap Callout** (wrap selected text in a `> [!info] ...` block). Both are accessed from the right-click context menu under "Alapaki: More...".

## Scope

This module covers the Change Case and Wrap Callout features, spanning the Vue 3 modal (`ChangeCaseModal`), the Vue component (`ChangeCase.vue`), the handler functions in `main.ts`, and the context menu registration. It does **not** cover the clipboard image or LaTeX modal features.

## Architecture / Flow

### Change Case

```
  User selects text → Right-click → "Alapaki: More..." → "Change Case"
        │
        ▼
  handleChangeCase(editor)           [main.ts:567]
        │
        ├── Validates selection (non-empty)
        ├── Creates ChangeCaseModal with selectedText
        │       │
        │       ▼
        │   openWithPromise()         [changecase_modal.ts:27]
        │       │
        │       ├── Mounts Vue 3 app (ChangeCase.vue) in modal content
        │       │       │
        │       │       ▼
        │       │   User picks a case button → text transforms client-side
        │       │       7 case options:
        │       │         - Sentence case
        │       │         - lower case
        │       │         - UPPER CASE
        │       │         - Capitalized Case
        │       │         - aLtErNaTiNg cAsE
        │       │         - Title Case
        │       │         - InVeRsE CaSe
        │       │
        │       ├── User clicks "Insert" → returns { textContent } via callback
        │       └── User clicks "Cancel" → returns null
        │
        └── If result !== null: editor.replaceSelection(result.textContent)
```

### Wrap Callout

```
  User selects text → Right-click → "Alapaki: More..." → "Wrap as Callout"
        │
        ▼
  handleWrapCallout(editor, view)    [main.ts:612]
        │
        ├── Validates view exists
        ├── Validates selection (non-empty)
        ├── Checks if already a callout:
        │     selectedText.trimStart().startsWith("> [!")
        │     → If yes, shows Notice and returns
        │
        └── Replaces selection with:
            > [!info]
            > <selected text, with \n replaced by \n> >
```

## Key Files

| File | Role |
|------|------|
| `src/main.ts` (`handleChangeCase`, line 567) | Orchestrates Change Case: validates, opens modal, replaces selection |
| `src/main.ts` (`handleWrapCallout`, line 612) | Orchestrates Wrap Callout: validates, builds callout block, replaces selection |
| `src/modals/changecase_modal.ts` | Defines `ChangeCaseModal` class (extends Obsidian `Modal`), mounts Vue, returns value via promise |
| `src/components/ChangeCase.vue` | Vue 3 SFC: 7 case-transformation buttons + editable textarea + Cancel/Insert |
| `src/libs/contextmenu.ts` | Registers both commands as submenu items under "Alapaki: More..." |

## ChangeCaseModal Details

- Extends `obsidian.Modal`.
- Accepts `ChangeCaseInputArgs` (`{ selectedText: string }`).
- `openWithPromise()` returns `Promise<callbackValue>` where `callbackValue = { textContent: string } | null`.
- Vue app is mounted inside `this.containerEl.children[1]` (the modal's content area).
- Vue component receives three props: `close`, `insertData`, `values`.
- When `insertData` fires, the modal sets `this.returnValue` and calls `this.close()`, which triggers the promise resolve.
- On close (user cancel or X button), `this.vueApp.unmount()` and `this.contentEl.empty()` are called.

## Wrap Callout Logic

- Uses hardcoded callout type `info` (not user-selectable).
- Handles multi-line selections by replacing `\n` with `\n> ` so each line is properly prefixed.
- Does **not** use the `insertContent` helper — directly calls `editor.replaceSelection()`.
- The "already a callout" check is a simple `startsWith("> [!")` — it does not parse the full Obsidian callout syntax.

## Conventions

- **No external LLM calls** — both features are entirely client-side.
- **Change Case types are client-side functions** in the Vue component (no dependency on case libraries).
- **Promise-based modal pattern**: All modals that return a value (`ChangeCaseModal`, `InsertLatexModal`) follow the same `openWithPromise()` + `callbackValue` pattern.
- **Context menu is a submenu**, registered once in `onload()` via `registerContextMenu()`.

## Common Mistakes

1. **Adding a new case type without updating both the `optionsCase` array AND the `handleCase` switch.** Both must stay in sync — the array drives the UI buttons, the switch drives the transformation.

2. **Assuming `handleWrapCallout` supports custom callout types.** The callout type is hardcoded to `"info"`. If you want `tip`, `warning`, etc., you must change the `calloutType` variable or add a UI picker.

3. **Forgetting the "already a callout" guard.** Without it, wrapping nested callouts would produce malformed Markdown.

4. **Null-checking the modal result.** `openWithPromise()` returns `{ textContent: string } | null`. The `if (result)` guard in `handleChangeCase` correctly handles the cancel case.

5. **Mounting Vue in the wrong container.** The modal's `contentEl.children[1]` is where Obsidian renders the modal body. Mounting to `contentEl` directly can cause styling issues.
