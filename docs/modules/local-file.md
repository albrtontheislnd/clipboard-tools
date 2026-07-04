# Local File Insertion

## Purpose

The Local File Insertion feature allows users to insert Markdown links to local files into their Obsidian notes. Users can provide a list of absolute file paths (one per line) and optionally choose to keep the file extension in the link text. The plugin converts each absolute path to a vault-relative link and inserts them as Markdown links.

## Scope

This module covers the Insert Local File modal (`InsertLocalFileModal`), the Vue component (`AddLocalFile.vue`), the context menu item, the command, and the utility function `tUtils.processFilePath` used to parse and convert file paths. It does not cover other file-related features such as image processing or clipboard image handling.

## Architecture / Flow

### Insert Local File Flow

```text
User invokes "Insert file paths" command (via command palette or context menu)
        │
        ▼
handleLocalFileModal(editor)          [main.ts:???]
        │
        ├── Creates InsertLocalFileModal with default args (paths: "", keepExtension: false)
        │
        ▼
openWithPromise()                     [localfile_modal.ts:44]
        │
        ├── Stores close handler
        │
        ▼
openModal()                           [localfile_modal.ts:67]
        │
        ├── Creates Vue app (AddLocalFile.vue) with props: close, insertData, values
        │
        ▼
Mounts Vue app in modal content area
        │
        │
        ▼
User interacts with AddLocalFile.vue:
        │
        ├─ Types or pastes absolute file paths (one per line) into the textarea
        ├─ Toggles "Keep file extension in link text" checkbox (optional)
        ├─ Clicks "Cancel" → modal closes, returns null
        │
        └─ Clicks "Insert" → calls insertData callback with { textContent: string }
                │
                ▼
        Modal sets returnValue and calls close()
        │
        ▼
Promise resolves with returnValue (or null if cancelled)
        │
        ▼
handleLocalFileModal receives result:
        │
        ├─ If result is null → do nothing
        │
        └─ If result is not null:
                │
                ▼
        Get current cursor position
        Insert the returned textContent at the cursor (does not replace selection)
        Move cursor to end of inserted text
```

### Path Processing (in AddLocalFile.vue and tUtils.processFilePath)

1. Each line from the textarea is trimmed; empty lines are skipped.
2. For each non-empty line:
   - Strip surrounding single or double quotes.
   - Split by forward slash or backslash to get segments (OS-agnostic).
   - Take the last segment as the basename.
   - If the basename contains a dot and the dot is not the first character (i.e., not a hidden file like `.bashrc`), remove the extension to get the filename.
   - Otherwise, keep the basename as the filename.
   - URL-decode the filename (to handle percent-encoded characters).
   - Normalize the path: convert backslashes to forward slashes, collapse multiple slashes, trim leading/trailing slashes.
   - Determine if the path is a Windows UNC path (starts with `//`).
   - If UNC, extract hostname and adjust the path accordingly.
   - Percent-encode each path segment (except the drive letter prefix for Windows, e.g., `C:/` stays as `C:/`).
   - Join encoded segments with `/` to form `uriPath`.
   - Construct the file URI:
        - For UNC: `file://{hostname}{uriPath}`
        - For local: `file://{uriPath}` (ensuring three slashes if no hostname).
   - The link text is either the filename (without extension if `keepExtension` is false) or the basename (with extension) if `keepExtension` is true.
   - Format as Markdown link: `[link text](fileUri)`.

3. All generated Markdown lines are joined with newline and returned as a single string.

## Key Files

| File | Role |
|------|------|
| `src/main.ts` | Registers the `alapaki-insert-file-paths` command and adds the menu item to the context menu. Contains `handleLocalFileModal` method. |
| `src/modals/localfile_modal.ts` | Defines `InsertLocalFileModal` class (extends Obsidian `Modal`), manages Vue app lifecycle, returns promise with result. |
| `src/components/AddLocalFile.vue` | Vue 3 SFC: textarea for file paths, checkbox for keepExtension, Cancel and Insert buttons. Emits `insertData` with the generated Markdown links. |
| `src/libs/contextmenu.ts` | Adds "Insert file paths" submenu item under "Alapaki: More..." in the editor context menu. |
| `src/libs/utils.ts` | Contains `tUtils.processFilePath` (static method) that performs the path-to-URI conversion and filename extraction used by the Vue component. |

## AddLocalFile.vue Details

- **Template**:
  - `<textarea>` bound to `textContent` (user input of file paths).
  - `<div class="option-row">` with checkbox bound to `keepExtension` and label "Keep file extension in link text".
  - `<div class="fitsizer">` containing Cancel and Insert buttons.
- **Script** (`setup`):
  - Props: `close` (function), `insertData` (function), `values` (object with `paths` and `keepExtension`).
  - Local refs: `textContent` (string), `keepExtension` (boolean).
  - `handleCancel()`: calls `props.close()`.
  - `handleInsert()`:
        - Splits `textContent.value` by newline.
        - For each line, trims and skips empty.
        - Calls `tUtils.processFilePath(trimmed)` to get `{ filename, fileUri }`.
        - Determines display text: if `keepExtension.value` is true, use `fileUri.split('/').pop().pop()`; else use `filename`.
        - Pushes `[${displayText}](${fileUri})` to results array.
        - If results empty, shows notice and returns.
        - Joins results with newline and calls `props.insertData({ textContent: results.join('\\n') })`.
- **Style**: Scoped styling for textarea, buttons, labels, etc.

## InsertLocalFileModal Details

- Extends `obsidian.Modal`.
- Properties:
    - `vueApp`: Vue app instance (nullable).
    - `returnValue`: Holds the result to resolve the promise (`{ textContent: string } | null`).
    - `inputValue`: The arguments passed to the constructor (`{ paths: string, keepExtension: boolean }`).
    - `closeHandler`: Function stored to resolve the promise on close.
- Methods:
    - `cleanup()`: Unmounts Vue app, nulls reference, empties container element.
    - `openWithPromise()`: Returns a promise that resolves with the modal's result. Sets up `closeHandler`, overrides `onClose`, then calls `openModal()`.
    - `openModal()`: Tries to create and mount the Vue app (AddLocalFile.vue) with the provided props. On error, logs, cleans up, and closes the modal.
    - `open()`: Calls Obsidian's `this.open()` to actually open the modal (called at the end of `openModal()`).

## Conventions

- **Modal Pattern**: Follows the same `openWithPromise()` pattern as other modals (ChangeCaseModal, InsertLatexModal, etc.): returns a promise that resolves to a callback value (`{ textContent: string } | null`). The modal calls `insertData` with the result before closing.
- **Path Processing**: Delegates path parsing and URI generation to the static `tUtils.processFilePath` method to ensure consistency and reusability.
- **Vue Lifecycle**: The modal creates the Vue app in `openModal()` and ensures cleanup in `cleanup()` (called from `closeHandler` which is set as the override for `onClose`). This prevents memory leaks.
- **No External Dependencies**: The feature is entirely client-side; no API calls are made.
- **Insertion Behavior**: Text is inserted at the current cursor position (not replacing any selection). The cursor is moved to the end of the inserted text.