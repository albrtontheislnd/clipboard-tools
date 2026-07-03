# tUtils API Reference

> **Source:** `src/libs/utils.ts`

The `tUtils` class is a static utility class providing stateless helper methods for filename generation, path sanitization, vault name slugification, URL validation, image format conversion, and clipboard image detection.

---

## Method Reference

### `randomFilename`

```typescript
static randomFilename(fileExtension?: string): string
```

Generates a random filename in the format `img_{ISODateTime}_{random5chars}.{ext}`.

| Parameter       | Type     | Default | Description                                        |
|-----------------|----------|---------|----------------------------------------------------|
| `fileExtension` | `string` | `''`    | File extension to append (e.g. `'png'`, `'jpg'`). If empty, no extension is added. |

**Returns:** `string` — A unique, timestamped filename.

**Details:**

- ISO datetime: `new Date().toISOString().replace(/[:.-]/g, '')` — e.g. `20250628T143022123Z`
- Random string: `Math.random().toString(36).slice(2, 7)` — 5 random alphanumeric characters
- Extension is lowercased and prefixed with `.`

**Example output:**
```
img_20250628T143022123Z_a3xr9.png
img_20250628T143022123Z_k7bw2
```

---

### `localPathToPartialUrl`

```typescript
static localPathToPartialUrl(localFilePath: string, defName?: string): string
```

Normalizes a local file path into a partial URL-safe path, with path-traversal guards.

| Parameter    | Type     | Default    | Description                              |
|--------------|----------|------------|------------------------------------------|
| `localFilePath` | `string` | *(required)* | Raw local file path to normalize |
| `defName`    | `string` | `'uploads'` | Fallback value if the path is unsafe or empty |

**Returns:** `string` — Sanitized partial URL path.

**Transformation steps:**

1. **Normalize separators:** Backslashes `\` → forward slashes `/`
2. **Deduplicate slashes:** `//` → `/`
3. **Strip leading/trailing slashes**
4. **Sanitize characters:** Removes all non-alphanumeric characters except `.`, `-`, `_`, `/`
5. **Path-traversal guard:** If the result is `.`, starts with `../`, or contains `/../`, falls back to `defName`

> ⚠️ **Recent change:** `defName` was added as a parameter (default `'uploads'`). Previously the method had no fallback parameter. The path-traversal guards (checking for `.`, `../`, and `/../`) were also added to prevent S3 path-injection attacks.

**Examples:**

| Input                        | Result        |
|------------------------------|---------------|
| `"images\\subdir\\photo.png"`  | `images/subdir/photo.png` |
| `"../../etc/passwd"`         | `uploads`     |
| `"."`                        | `uploads`     |
| `"vault/notes/../secret"`    | `uploads`     |
| `"safe/path/to/file.jpg"`    | `safe/path/to/file.jpg` |

---

### `slugifyVaultName`

```typescript
static slugifyVaultName(name: string): string
```

Converts an Obsidian vault name into a filesystem- and S3-safe string.

| Parameter | Type     | Default      | Description            |
|-----------|----------|--------------|------------------------|
| `name`    | `string` | *(required)* | Raw vault name to slugify |

**Returns:** `string` — Sanitized, URL-safe vault name.

**Processing steps:**

1. Lowercases the string
2. Replaces any run of non-alphanumeric Unicode characters with `-`
3. Removes leading/trailing dashes
4. Strips Windows-reserved characters: `<>:"/\|?*`
5. Trims trailing dots/spaces
6. Removes control characters (U+0000–U+001F, U+007F)
7. Truncates to 255 characters max; removes trailing `-` or `.` after truncation
8. Falls back to `'untitled-vault'` if the result is empty

**Examples:**

| Input                       | Result            |
|-----------------------------|-------------------|
| `"My Cool Vault!"`          | `my-cool-vault`   |
| `"   Vault Name   "`        | `vault-name`      |
| `"a/b\\c:d"`                | `abc-d`           |
| `""`                        | `untitled-vault`  |

---

### `isValidHttpUrl`

```typescript
static isValidHttpUrl(input: string): boolean
```

Validates whether a string is a valid HTTP or HTTPS URL.

| Parameter | Type     | Default      | Description            |
|-----------|----------|--------------|------------------------|
| `input`   | `string` | *(required)* | String to validate     |

**Returns:** `boolean` — `true` if the string is a valid `http:` or `https:` URL.

**Details:**

- Uses the `new URL(input)` constructor to parse
- Returns `true` **only** for `http:` and `https:` protocols
- Returns `false` for `ftp:`, `file:`, `data:`, or any other protocol
- Returns `false` for invalid/malformed URLs (exception caught)

**Examples:**

| Input                          | Result  |
|--------------------------------|---------|
| `"https://example.com"`        | `true`  |
| `"http://localhost:5764"`      | `true`  |
| `"ftp://files.example.com"`    | `false` |
| `"not-a-url"`                  | `false` |
| `"file:///tmp/test.png"`       | `false` |

---

### `convertImageLocally`

```typescript
static async convertImageLocally(blob: Blob, format: string, quality: number): Promise<Blob | null>
```

Converts an image blob to a target format using the native Web Browser canvas API. Useful for local (server-free) image conversion.

| Parameter | Type     | Default      | Description                                    |
|-----------|----------|--------------|------------------------------------------------|
| `blob`    | `Blob`   | *(required)* | Source image blob                              |
| `format`  | `string` | *(required)* | Target format (`'webp'`, `'jpeg'`, `'png'`)   |
| `quality` | `number` | *(required)* | Compression quality in percentage (1–100)      |

**Returns:** `Promise<Blob | null>` — Converted image blob, or `null` on error.

**Details:**

- Loads the blob into an HTML `Image` element
- Draws the image onto an offscreen `<canvas>` element
- Converts via `canvas.toBlob()`
- MIME type mapping: `format === 'jpeg'` → `'image/jpeg'`, otherwise `'image/{format}'`
- Quality mapping: `quality / 100` → range `0.01`–`1.0` (clamped)
- Uses `URL.createObjectURL()` / `URL.revokeObjectURL()` for blob lifecycle
- Returns `null` on any error (canvas context missing, image load failure, conversion failure)

---

### `hasImageInClipboard`

```typescript
static async hasImageInClipboard(): Promise<boolean>
```

Checks whether the system clipboard currently contains any image data.

**Returns:** `Promise<boolean>` — `true` if at least one clipboard item has a MIME type starting with `'image/'`.

**Details:**

- Uses `navigator.clipboard.read()` (Clipboard API)
- Returns `false` if the Clipboard API is unavailable (`!navigator.clipboard || !navigator.clipboard.read`)
- Gracefully handles `NotAllowedError` (user permission not granted)
- Returns `false` on any other error

---

## Usage Examples

```typescript
import { tUtils } from './libs/utils';

// Generate a random filename
const filename = tUtils.randomFilename('webp');
// → "img_20250628T143022Z_a3xr9.webp"

// Sanitize a local path for S3
const partialUrl = tUtils.localPathToPartialUrl(
  'My Vault\\attachments\\image.png'
);
// → "My Vault/attachments/image.png"

// Unsafe path falls back to default
const unsafePath = tUtils.localPathToPartialUrl('../../../etc/passwd');
// → "uploads"

// Slugify a vault name
const slug = tUtils.slugifyVaultName('My Research Vault!');
// → "my-research-vault"

// Validate a URL
const valid = tUtils.isValidHttpUrl('http://localhost:5764');
// → true

// Convert an image blob locally
const blob = new Blob([/* image data */], { type: 'image/png' });
const converted = await tUtils.convertImageLocally(blob, 'webp', 80);
// → Blob (image/webp, quality ~0.8)

// Check clipboard for images
const hasImage = await tUtils.hasImageInClipboard();
// → true/false
```

---

## Recent Changes

### `normalizeMathDelimiters` — New method for LaTeX math delimiter normalization

- **What added:** New static method `normalizeMathDelimiters(markdown: string): string` that converts LaTeX display math (`\\[ ... \\]`) to `$$...$$` and inline math (`\\( ... \\)`) to `$...$`, while protecting code fences, inline code, and HTML columns from being modified.
- **Why:** Ensures consistent math delimiter formatting in OCR and text processing outputs, converting LaTeX-style delimiters to Obsidian/MathJax-compatible format.
- **Migration:** New method, no migration needed.

### `localPathToPartialUrl` — Added `defName` parameter and path-traversal guards

- **What changed:** The method signature changed from `(localFilePath: string)` to `(localFilePath: string, defName: string = 'uploads')`.
- **Why:** Prevents path-injection attacks where a user-controlled file path could escape the intended S3 directory. If the sanitized path is `.`, starts with `../`, or contains `/../`, the method now returns `defName` instead of the unsafe path.
- **Migration:** All existing callers that omit `defName` automatically get the `'uploads'` fallback, preserving backward compatibility.
