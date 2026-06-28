# Project Brief

## Core Requirements

Alapaki Tools is an Obsidian community plugin that provides a suite of editor utilities for power users. The plugin must:

1. **Image Optimization** — Convert clipboard images (PNG) to WEBP, AVIF, JPEG, or PNG format with configurable compression, saving locally or to S3.
2. **OCR / Image-to-Markdown** — Extract text from images using an external API server, with two pipelines: structured markdown conversion and raw text extraction.
3. **AI Text Operations** — Summarize selected text, run Chinese language analysis (grammar, word usage), and power an inline LLM prompt-callout system.
4. **LaTeX Authoring** — Provide inline autocomplete for LaTeX symbols inside math blocks and a GUI LaTeX symbol browser/inserter.
5. **Dictionary Sidebar** — A custom Obsidian ItemView that mounts a Vue 3 dictionary component, configured via settings.
6. **Text Utilities** — Case conversion (UPPER, lower, Title, camelCase, etc.) and text-to-callout wrapping.

## Goals

- Replace manual image optimization workflows with a single right-click or command palette action.
- Bring AI-assisted text processing into the Obsidian editor without leaving the note.
- Provide a seamless LaTeX authoring experience with both inline autocomplete and GUI browsing.
- Support Chinese language learners with grammar explanations and word usage lookups.
- Enable extensible LLM workflows via prompt callout blocks.

## Scope

- **In scope**: All features listed above. Integration via Obsidian commands, editor menu, and right-click context submenu. Settings tab for configuration.
- **Out of scope**: Direct cloud provider SDK usage (AWS S3 calls go through the API server). Native image editing (cropping, filters, etc.). Real-time collaboration. Mobile support.

## Source of Truth

- **Package name**: `alapaki-tools`
- **Display name**: Clipboard Tools: Optimizer & Conversion
- **Root** `/Users/albert/Code/demo/.obsidian/plugins/alapaki-tools/`
- **Entry point**: `src/main.ts` (`ImgWebpOptimizerPlugin` class)
- **Version**: 1.0.0
- **License**: MIT

## Key Constraints

- All code runs in Obsidian's Electron browser context.
- `navigator.clipboard.read()` requires user interaction (transient activation) and only `image/png` MIME type is handled.
- AVIF conversion requires an external API server — no native browser support.
- S3 uploads require a backend API server — no AWS SDK in the plugin.
- Single global async lock (`this.locked`) gates all operations.
