# OCR & AI Module

## Purpose

The OCR & AI module provides optical character recognition (OCR) and text summarisation capabilities. It supports three OCR pipelines — image-to-markdown conversion, raw text extraction, and quick text extraction via Apple Vision Framework — plus an AI-powered text summariser. Users interact with this module via commands that send clipboard or embedded images to an external API server and insert the results into their notes.

## Scope

- **Image-to-Markdown OCR**: Converts an image (WEBP optimised, ≤1024×1024) into structured markdown via `POST /images/ocr`.
- **Raw Text Extraction OCR**: Sends the original PNG image to `POST /images/ocr-vision` for pure text extraction without formatting.
- **Quick Text Extraction**: Sends the raw PNG image to `POST /images/ocr-quick` for fast, locally-processed text extraction via Apple Vision Framework.
- **Text Summarisation**: Sends extracted text or user-provided content to `POST /text/generator` with a prompt and system message.
- **Content Insertion**: Handles inserting OCR results as either inline text, HTTP image URLs, or local `![[path]]` embeds.
- **Modal UI**: Displays results in an `ImageTextModal` with a toggle for embedding the original image alongside the OCR output.
- **Loading State**: Shows a `LoadingModal` while API calls are in flight.

## Architecture / Flow

### Pipeline 1: Image-to-Markdown OCR (`convertImageToMarkdown`)

```
clipboard image (PNG)
  └─ optimizeImageToWebP(blob, maxWidth=1024, maxHeight=1024)
       └─ POST /images/ocr (optimised WEBP)
            └─ insertContent(result, imageUrl)
                 ├─ if HTTP URL → `![alt](url)`
                 └─ if local    → `![[path]]`
```

1. The raw clipboard PNG is optimised to WEBP format with dimensions capped at 1024×1024 (preserving aspect ratio).
2. The optimised WEBP is uploaded to the OCR endpoint.
3. The returned markdown text is inserted at the cursor position.
4. If the user toggled "embed original image", the original image reference is prepended.

### Pipeline 2: Raw Text Extraction (`extractTextFromImage`)

```
clipboard image (PNG)
  └─ uploadToOCRVisionEndpoint(blob) → POST /images/ocr-vision
       └─ returns plain text string
```

1. The raw PNG (no optimisation) is sent directly to the vision OCR endpoint.
2. The returned plain text is inserted at the cursor position.

### Pipeline 3: Quick Text Extraction (`quickExtractTextFromImage`)

```
clipboard image (PNG)
  └─ uploadToOCRQuickEndpoint(blob) → POST /images/ocr-quick
       └─ returns plain text string (Apple Vision Framework)
```

1. The raw PNG (no optimisation) is sent directly to the quick OCR endpoint.
2. The endpoint uses Apple Vision Framework for fast, local-speed text extraction.
3. The returned plain text is presented in the `ImageTextModal` for review, same as the other pipelines.

### Pipeline 4: Text Summarisation (`handleSummarize`)

```
selected text or clipboard content
  └─ POST /text/generator(prompt, systemMessage)
       └─ insert response text at cursor
```

1. The summariser endpoint receives a prompt (the text to summarise) and an optional system message.
2. The generated response replaces or is inserted after the original text.

### Modal Presentation

- `ImageTextModal` (defined in `src/modals/aiprompt_modal.ts`):
  - Displays the OCR result (markdown or plain text).
  - Provides a toggle (`setContent`) to choose whether to embed the original image.
  - On confirmation, calls `insertContent()` to write into the note.
- `LoadingModal` is shown during any API round-trip.

## Key Files

| File | Role |
|---|---|
| `src/libs/ocr-utils.ts` | Core OCR/AI functions: `convertImageToMarkdown`, `extractTextFromImage`, `quickExtractTextFromImage`, `optimizeImageToWebP`, `insertContent`, `uploadToOCREndpoint`, `uploadToOCRVisionEndpoint`, `uploadToOCRQuickEndpoint` |
| `src/modals/aiprompt_modal.ts` | `ImageTextModal` — shows OCR results and embedding toggle |
| `src/main.ts` | Command handlers: `handleOCR(editor, mode)` where `mode` is `'markdown'`, `'extract-text'`, or `'quick-extract'` |

## API Endpoints

### `POST /images/ocr`

- **Input**: Optimised WEBP image (≤1024×1024) — sent as binary/FormData.
- **Output**: Structured markdown text (headings, lists, code blocks, etc.).
- **Use case**: Best for screenshots, slides, or formatted documents.

### `POST /images/ocr-vision`

- **Input**: Raw PNG image — sent as binary/FormData.
- **Output**: Plain text string (unformatted).
- **Use case**: Best for simple text extraction where formatting is not needed.

### `POST /images/ocr-quick`

- **Input**: Raw PNG image — sent as binary/FormData.
- **Output**: Plain text string (unformatted), processed via Apple Vision Framework.
- **Use case**: Fast, local-speed text extraction. Best when latency matters and formatting is not needed.

### `POST /text/generator`

- **Input**: JSON body with `{ prompt: string, systemMessage?: string }`.
- **Output**: Generated text response.
- **Use case**: Summarisation, rewriting, or any AI text generation.

## Conventions

- **WEBP optimisation**: Images are converted to WEBP for the markdown OCR pipeline, capped at 1024×1024 to reduce payload size and API latency.
- **Raw PNG for vision/quick**: Both text extraction pipelines send unmodified PNG — this preserves maximum detail for recognition.
- **Input validation**: All endpoint calls validate inputs via `stringOrEmptySchema` (Zod schema), ensuring only strings (including empty strings) are sent.
- **Content insertion strategy**: `insertContent()` distinguishes between HTTP URLs (inserted as `![alt](url)`) and local vault paths (inserted as `![[path]]`).
- **Modal lifecycle**: Loading modal is dismissed before the result modal is opened — they never stack.
- **Error handling**: API failures surface an Obsidian `Notice` with the error message; the `LoadingModal` is dismissed on error too.
- **Three-mode OCR handler**: `handleOCR(editor, mode)` supports `'markdown'` (default), `'extract-text'`, and `'quick-extract'`. Each maps to a different OCR pipeline while sharing the same modal UI and locking logic.

## Common Mistakes

1. **Image too large for OCR pipeline**: If the clipboard image exceeds 1024×1024 after optimisation, the API may reject it. The `optimizeImageToWebP` function should handle resizing, but extremely large aspect ratios may produce suboptimal results.
2. **Confusing the OCR pipelines**: `convertImageToMarkdown` is for structured output (markdown), while `extractTextFromImage` and `quickExtractTextFromImage` return raw text. Using the wrong one yields unexpected formatting.
3. **Missing API server config**: All OCR endpoints require `settings.apiServer` to be set. Without it, the calls silently fail or throw.
4. **Embedded image path resolution**: When `insertContent` creates a `![[path]]` embed, the path must be relative to the vault root. If the image was saved elsewhere, the embed will be broken.
5. **Forgetting `stringOrEmptySchema`**: All inputs to the AI endpoints are validated with Zod. Passing `null` or `undefined` will throw a validation error before the network request.
6. **Summariser prompt injection**: The summariser takes a free-form prompt. If the prompt includes special characters or markdown syntax, the API response may be malformed.