# Image WebP Optimizer for Obsidian

## Overview

Image WebP Optimizer is a plugin for Obsidian that automatically converts pasted images to the WebP format. This plugin enhances your note-taking experience by providing efficient storage and faster loading times for images without compromising on quality.

## Features

- **Automatic Conversion**: Converts clipboard images to WebP format upon pasting.
- **Quality Preservation**: Maintains image quality while reducing file size.
- **Seamless Integration**: Automatically embeds converted images into your notes.
- **Efficient Workflow**: No additional steps required after pasting an image.

## Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click on Browse community plugins
4. Search for "Image WebP Optimizer"
5. Click Install
6. Once installed, toggle on the plugin to activate it

## Usage

1. Copy any image to your clipboard
2. Paste directly into your Obsidian note using Command "Embed clipboard image as WEBP format," or define a keyboard shortcut.
3. The plugin will automatically convert the image to WebP and embed it in your note

No further action is required on your part. The plugin handles the conversion and embedding process seamlessly.

## Configuration

Currently, the plugin uses a default WebP quality setting of 0.9. Future versions may include options to customize this setting.

## Technical Details

- The plugin uses the browser's native WebP encoding capabilities.
- Images are converted using an in-memory canvas to ensure privacy and speed.
- Converted images are saved with a timestamp-based filename to avoid conflicts.

## Compatibility

This plugin is compatible with the latest version of Obsidian. It requires a browser that supports WebP encoding.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Acknowledgements

Thanks to the Obsidian team and community for creating and maintaining such a powerful and extensible application.
