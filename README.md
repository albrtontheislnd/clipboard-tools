# Clipboard Tools: Optimizer & Conversion

## Overview

This Obsidian plugin optimizes images pasted from the clipboard, converting them to WEBP, AVIF, PNG, or JPEG. It also leverages AI models (Anthropic, Google, Mistral) to convert images and summarize text.

Supports WEBP, PNG, and JPEG using native encoding capabilities (Offscreen Canvas).
Supports AVIF by calling external ffmpeg/ImageMagick/libvips binaries.


## Features

* Optimizes clipboard images into WEBP, AVIF, PNG, or JPEG format.
* Converts images to Markdown or LaTeX using AI.
* Summarizes selected text using AI.
* Customizable compression level and image format.
* Integrates seamlessly with the Obsidian editor menu.
* Supports multiple AI models with API key configuration.

- **Automatic Conversion**: Converts clipboard images to WebP format upon pasting.
- **Quality Preservation**: Maintains image quality while reducing file size.
- **Seamless Integration**: Automatically embeds converted images into your notes.
- **Efficient Workflow**: No additional steps required after pasting an image.

## Installation

1. Open Obsidian settings.
2. Go to Community plugins.
3. Search for "Clipboard Tools: Optimizer & Conversion".
4. Install the plugin.
5. Enable the plugin in the Community plugins list.

## Usage

### Optimizing Images

1. Copy an image to your clipboard.
2. In an Obsidian editor, right-click and select "Clipboard: Embed optimized WEBP/AVIF/PNG/JPEG" (or use the command palette). The optimized image will be embedded in your note.

### Converting Images to Markdown/LaTeX

1. Copy an image to your clipboard.
2. In an Obsidian editor, right-click and select "Clipboard: Convert to Markdown" (or use the command palette).
3. A modal will appear displaying the converted Markdown/LaTeX. Choose whether to include the original image as well.

### Summarizing Text

1. Select the text you want to summarize.
2. In the Obsidian editor, right-click and select "Clipboard: Summarize text" (or use the command palette).
3. The summarized text will be inserted below the original selection.

## Configuration

1. Open Obsidian settings.
2. Go to "Clipboard Tools: Optimizer & Conversion".
3. Configure the following settings:
    * **Image Format:** Choose the desired output format (WEBP, AVIF, PNG, JPEG).
    * **Compression Level:** Adjust the compression level (0-100).
    * **Bin Exec:** Path to external binaries (like `cwebp` for AVIF). Mostly for AVIF support.
    * **AI Model:** Select the AI model to use (e.g., Anthropic, Google, Mistral).
    * **AI Model API Key:** Enter your API key for the selected AI model.

## Technical Details

- The plugin uses the browser's native WebP encoding capabilities.
- Images are converted using an in-memory canvas to ensure privacy and speed.
- Converted images are saved with a timestamp-based filename to avoid conflicts.

## Dependencies

* External binaries for AVIF conversion (optional, configured via settings)

## Compatibility

This plugin is compatible with the latest version of Obsidian. It requires a browser that supports WebP encoding.

## Known Issues

* AVIF conversion relies on external binaries and might not work on all systems.
* AI model performance may vary depending on the input and API key limitations.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

https://buymeacoffee.com/albrtontheislnd

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Acknowledgements

Thanks to the Obsidian team and community for creating and maintaining such a powerful and extensible application.

## Future Enhancements

* Support for additional image formats.
* Integration with more AI models.
* Improved error handling and user feedback.