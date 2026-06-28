# Dictionary

## Purpose

The Dictionary module provides a dedicated "Dictionary" view in Obsidian's right sidebar. It mounts a Vue 3 application that provides dictionary lookup functionality, accessible via a ribbon icon and a command palette command.

## Scope

This module covers the `DictionaryView` class (extending Obsidian's `ItemView`), its Vue 3 UI component (`dictUI.vue`), and the `activateDictionaryView()` method in `main.ts` that opens/reuses the view. It does **not** cover the dictionary data sources or API — the Vue component receives an `apiServer` prop and manages its own API calls.

## Architecture / Flow

### Opening the Dictionary View

```
  User clicks ribbon icon   OR   User runs command "Open Alapaki Dictionary"
        │                                    │
        └──────────────┬─────────────────────┘
                       ▼
         activateDictionaryView()     [main.ts:712]
                       │
               ┌───────┴───────┐
               │               │
          Leaf exists?    No leaf exists?
               │               │
          Reuse existing    Create new leaf via
          leaf (leaves[0])  workspace.getRightLeaf(false)
               │               │
               └───────┬───────┘
                       ▼
             workspace.revealLeaf(leaf)
                       │
                       ▼
             DictionaryView.onOpen() on the leaf
```

### DictionaryView Lifecycle (`src/dict/dictUI.ts`)

```
  constructor(leaf, plugin)
    └── Stores plugin reference (for settings access)

  onOpen()
    ├── Gets container: this.containerEl.children[1]
    ├── Empties container
    ├── Creates div with cls 'dictionary-vue-container'
    ├── Creates Vue 3 app mounting DictionaryComponent
    │     Props: { apiServer: plugin.settings.apiServer }
    └── Calls this.vueApp.mount(vueContainer)

  onClose()
    ├── Calls this.vueApp?.unmount()
    └── Sets this.vueApp = null

  getViewType()    → 'alapaki-dictionary-view'
  getDisplayText() → 'Dictionary'
  getIcon()        → 'book-open'
```

## Key Files

| File | Role |
|------|------|
| `src/dict/dictUI.ts` | `DictionaryView` class extending `ItemView` — creates and manages the Vue 3 app lifecycle |
| `src/dict/dictUI.vue` | Vue 3 single-file component — the actual dictionary UI, receives `apiServer` as a prop |
| `src/main.ts` (`activateDictionaryView`, line 712) | Manages leaf creation/reuse and view activation |

## View Registration

The dictionary view is registered in the plugin's `onload()` phase (in `main.ts`) using:

```ts
this.registerView(VIEW_TYPE_DICTIONARY, (leaf) => new DictionaryView(leaf, this));
```

Where `VIEW_TYPE_DICTIONARY = 'alapaki-dictionary-view'` is the unique view type identifier.

The ribbon icon and command are also registered in `onload()`:

```ts
// Ribbon icon
this.addRibbonIcon('book-a', 'Open Alapaki Dictionary', () => {
    this.activateDictionaryView();
});

// Command
this.addCommand({
    id: 'open-alapaki-dictionary',
    name: 'Open Alapaki Dictionary',
    callback: () => this.activateDictionaryView(),
});
```

## Key Design Decisions

- **Single-instance pattern**: `activateDictionaryView()` checks for existing leaves of type `VIEW_TYPE_DICTIONARY` before creating a new one. This prevents multiple duplicate dictionary tabs from accumulating.
- **Right sidebar only**: New leaves are created via `workspace.getRightLeaf(false)`. A dictionary view cannot be created in the main editor area or left sidebar through this code path.
- **Vue app is recreated on every open**: `onOpen()` always destroys and recreates the Vue app. This ensures a fresh state each time.
- **Props pass settings**: The `apiServer` prop is passed from `plugin.settings.apiServer`, which connects the dictionary Vue component to the correct backend server.
- **Lifecycle is clean**: `onClose()` always unmounts the Vue app, preventing memory leaks.

## Conventions

- **View type constant** is an exported `const` (`VIEW_TYPE_DICTIONARY`), importable by other modules that need to reference the view type string.
- **Container targeting**: The Vue app is always mounted to `this.containerEl.children[1]` (the Obsidian ItemView content area). The first child (`children[0]`) is the view header.
- **Container div class**: The mount point div uses class `dictionary-vue-container` for CSS targeting.
- **Vue component filename**: The `.vue` file uses lowercase with dots: `dictUI.vue` (not `DictUI.vue`).
- **Plugin reference**: The `DictionaryView` holds a reference to the plugin instance (`ImgWebpOptimizerPlugin`) for accessing settings.

## Common Mistakes

1. **Not checking for existing leaves.** `activateDictionaryView()` checks `workspace.getLeavesOfType(VIEW_TYPE_DICTIONARY)` first. If you skip this, you'll create duplicate dictionary tabs every time the user clicks the icon.

2. **Mounting Vue to the wrong container.** `children[0]` is the view header/title bar. Always use `children[1]` for content, and ensure the container is emptied before mounting.

3. **Forgetting to unmount Vue in `onClose()`.** If `vueApp.unmount()` is not called, the Vue app continues running in the background whenever the view is hidden (not destroyed). The current code handles this in `onClose()`.

4. **Passing `apiServer` as undefined.** If `plugin.settings` is not initialized when `onOpen()` runs, the Vue component receives `undefined` for `apiServer`. Ensure settings are loaded before the view can be activated.

5. **Not importing the `.vue` file correctly.** The import uses `import DictionaryComponent from './dictUI.vue'` — ensure the path resolves correctly in both dev and production builds.

6. **Assuming the dictionary works without a backend.** The Vue component depends on `apiServer` to make API calls. Without a running server, the UI will show an error or empty state.
