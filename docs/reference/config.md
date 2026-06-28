# Settings Reference

> **Sources:** `src/settings.ts`, `src/libs/plugin_interfaces.ts`

This document describes the plugin settings interface, defaults, valid values, and the settings tab UI.

---

## Settings Interface

Defined in `src/libs/plugin_interfaces.ts`:

```typescript
export interface ImgOptimizerPluginSettings {
  imageFormat: string;      // 'webp' | 'avif' | 'png' | 'jpeg'
  compressionLevel: number; // 1–100
  apiServer: string;        // e.g. 'http://localhost:5764'
  useS3Storage: boolean;
}
```

### Settings Properties

| Property           | Type      | Default                    | Description                                          |
|--------------------|-----------|----------------------------|------------------------------------------------------|
| `imageFormat`      | `string`  | `'avif'`                   | Output format for image conversion                   |
| `compressionLevel` | `number`  | `70`                       | Image quality / compression level (1 = lowest quality / highest compression, 100 = highest quality / lowest compression) |
| `apiServer`        | `string`  | `'http://localhost:5764'`  | Base URL of the local API server used for OCR, text generation, and AVIF conversion |
| `useS3Storage`     | `boolean` | `true`                     | Whether to upload images to S3 storage or save them locally in vault |

---

## Default Settings

Defined in `src/settings.ts`:

```typescript
export const DEFAULT_SETTINGS: Partial<ImgOptimizerPluginSettings> = {
  imageFormat: 'avif',
  compressionLevel: 70,
  apiServer: 'http://localhost:5764',
  useS3Storage: true,
};
```

> **Note:** `DEFAULT_SETTINGS` is typed as `Partial<ImgOptimizerPluginSettings>` — see **TypeScript Suppressions** below.

Settings are loaded in `ImgWebpOptimizerPlugin.loadSettings()` via a shallow merge:

```typescript
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
```

This means individual settings that are missing from `plugin.data` (Obsidian's persisted storage) will fall back to the defaults.

---

## Valid Format Values

Defined in `src/settings.ts`:

```typescript
export const ConfigValues = {
  validFormats: ["webp", "png", "avif", "jpeg"],
};
```

| Format | MIME Type (local conversion) | Notes                              |
|--------|------------------------------|------------------------------------|
| `webp` | `image/webp`                 | Converted locally via canvas API   |
| `png`  | `image/png`                  | Converted locally via canvas API   |
| `avif` | *(remote API)*               | Requires the remote `apiServer` for conversion |
| `jpeg` | `image/jpeg`                 | Converted locally via canvas API. Output extension becomes `.jpg` |

The dropdown options for the settings UI are built from `ConfigValues.validFormats`:

```typescript
const validFormatsOptions: Record<string, string> = Object.fromEntries(
  ConfigValues.validFormats.map(item => [item, item])
);
```

Settings input validation clamps `imageFormat` to `validFormats`, falling back to `'webp'` if the value is not in the list.

---

## Settings Tab UI

The settings tab is implemented by `ImgOptimizerPluginSettingsTab` (extends `PluginSettingTab`) in `src/settings.ts`. It is registered in `initializePlugin()`:

```typescript
this.addSettingTab(new ImgOptimizerPluginSettingsTab(this.app, this));
```

### UI Controls

| Setting Label                | Control Type      | Description                                          | Validation / Constraints                                  |
|------------------------------|-------------------|------------------------------------------------------|-----------------------------------------------------------|
| **Image format**             | Dropdown          | Select output format (`webp`/`avif`/`png`/`jpeg`)    | Lowercased; falls back to `'webp'` if invalid             |
| **Compression Level**        | Slider (1–100)    | Image quality percentage                             | Clamped to `[1, 100]`, floored; falls back to `90`        |
| **Local API Server**         | Text input        | Base URL for the backend API server                  | Trimmed; placeholder: `http://localhost:3000`             |
| **Use S3 Storage**           | Toggle            | Enable/disable S3 uploads                            | Defaults to `false` if null/undefined                     |

### Compression Slider Behavior

```typescript
.setLimits(1, 100, 1)
.setDynamicTooltip()
.showTooltip()
```

- Range: 1–100 with step 1
- Displays a live tooltip showing the current value
- Setting name dynamically shows: `Compression Level (current value: {value})`
- Validation: `Math.min(100, Math.max(1, Math.floor(value))) || 90`

---

## TypeScript Suppressions

The `settings.ts` file contains several `@ts-expect-error` comments. These exist because `plugin.settings` is typed as `ImgOptimizerPluginSettings | undefined` (declared as `settings?: ImgOptimizerPluginSettings` in `main.ts`), while `DEFAULT_SETTINGS` is typed as `Partial<ImgOptimizerPluginSettings>`.

The suppressions are used at the following locations:

| Line (approx.) | Context                     | Suppressed Issue                                              |
|----------------|-----------------------------|---------------------------------------------------------------|
| 51             | `imageFormat` setter        | Accessing `this.plugin.settings.imageFormat` on optional property |
| 58             | Compression slider name     | Accessing `this.plugin.settings.compressionLevel` in template  |
| 64             | Compression slider value    | `setValue()` on optional `.settings` property                  |
| 70             | Compression onChange        | Assignment on optional `.settings` property                   |
| 84             | API server setter           | Assignment on `.settings!` (non-null assertion)               |

These are safe in practice because `settings` is always initialized by `loadSettings()` before the settings tab is displayed.

---

## How Settings Are Used

### Image Conversion (`convertWrapper` in `main.ts`)

```typescript
const defaultImageFormat = 'avif';
const defaultCompressionLevel = 70;
const imageFormat = this.settings?.imageFormat || defaultImageFormat;
```

The `convertWrapper` method uses:
- `this.settings?.imageFormat` — determines output format (falls back to `'avif'`)
- `this.settings?.compressionLevel` — determines quality (falls back to `70`)
- `this.settings?.apiServer` — determines the API endpoint URL base
- `this.settings?.useS3Storage` — controls whether `handleClipboardImage` uploads to S3 or saves locally

### OCR & Text Generation

- `this.settings?.apiServer` is used to construct endpoint URLs for OCR (`{apiServer}/ocr`), text generation (`{apiServer}/text/generator`), and Zhongwen analysis (`{apiServer}/text/zhongwen`).
