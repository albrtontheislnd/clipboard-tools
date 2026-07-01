export class tUtils {



	/**
	 * @description
	 * Generates a random filename in the format `img_{ISODateTime}_{randomString}.{fileExtension}`,
	 * where `{ISODateTime}` is the current datetime in ISO format and `{randomString}` is a random 5-character string.
	 * If `fileExtension` is not provided, the filename will not have an extension.
	 * 
	 * @param {string} [fileExtension] - The file extension to use (e.g., 'png', 'jpg', etc.).
	 * @returns {string} - A random filename.
	 */
	static randomFilename(fileExtension: string = ''): string {
		// img_{randomString}_{ISODateTime}
		const randomString = Math.random().toString(36).slice(2, 7);
		const isoDateTime = new Date().toISOString().replace(/[:.-]/g, '');
		
		// fileExtension?
		const formattedExtension = (fileExtension.length > 0) ? `.${fileExtension.toLowerCase()}` : '';

		// return filename
		return `img_${isoDateTime}_${randomString}${formattedExtension}`;
	}

	static localPathToPartialUrl(localFilePath: string, defName: string = 'uploads'): string {
		// Normalize paths to ensure consistent separators
		localFilePath = localFilePath.replace(/\\/g, '/');
		localFilePath = localFilePath.replace(/\/+/g, '/');
		localFilePath = localFilePath.replace(/^\/|\/$/g, '');
		localFilePath = localFilePath.replace(/[^a-zA-Z0-9\.-_\/]/g, '');

		if (
		localFilePath === '.' ||
		localFilePath.startsWith('../') ||
		localFilePath.includes('/../')
		) {
			localFilePath = defName;
		}		
		return localFilePath;
	}

	static slugifyVaultName(name: string): string {
		let sanitized = name
			.toLowerCase()
			// Replace disallowed filename characters, whitespace, punctuation with "-"
			.replace(/[^\p{L}\p{N}]+/gu, "-")
			// Trim leading/trailing dashes
			.replace(/^-+|-+$/g, "")
			// Remove Windows-reserved chars (also safer for S3)
			.replace(/[<>:"/\\|?*]/g, "")
			// Trim trailing dots/spaces (bad for Windows + S3 UI)
			.replace(/[. ]+$/g, "")
			// Remove control chars (U+0000–U+001F, U+007F)
			.replace(/[\x00-\x1F\x7F]/g, "");

		// Enforce max length (255 chars for filesystem, fits S3)
		if (sanitized.length > 255) {
			sanitized = sanitized.slice(0, 255);
			// Remove trailing "-" or "."
			sanitized = sanitized.replace(/[-.]+$/g, "");
		}

		// Fallback if empty
		if (!sanitized) {
			sanitized = "untitled-vault";
		}

		return sanitized;
	}

	/**
	 * Checks if the provided string is a valid HTTP or HTTPS URL.
	 *
	 * @param {string} input - The string to validate as a URL.
	 * @returns {boolean} - Returns true if the input is a valid HTTP or HTTPS URL, otherwise false.
	 */
	static isValidHttpUrl(input: string): boolean {
		try {
		  // Create a URL object to validate the input
		  const url = new URL(input);
	  
		  // Check if the protocol is http or https
		  return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
		  // If URL construction throws, it's not a valid URL
		  return false;
		}
	}

	/**
	 * Converts an image blob to the specified format using native Web Browser API
	 * @param blob - The source image blob
	 * @param format - Target format (webp, jpeg, png)
	 * @param quality - Compression quality (1-100)
	 * @returns Promise resolving to converted Blob or null on error
	 */
	static async convertImageLocally(blob: Blob, format: string, quality: number): Promise<Blob | null> {
		try {
			// Create an image element to load the blob
			const img = new Image();
			const url = URL.createObjectURL(blob);
			
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
				img.src = url;
			});

			// Create canvas and draw the image
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');
			
			if (!ctx) {
				URL.revokeObjectURL(url);
				return null;
			}

			ctx.drawImage(img, 0, 0);

			// Convert to target format
			const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
			const qualityValue = Math.max(0.01, Math.min(1, quality / 100));

			const convertedBlob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob(
					(blob) => resolve(blob),
					mimeType,
					qualityValue
				);
			});

			// Clean up
			URL.revokeObjectURL(url);

			return convertedBlob;
		} catch (error) {
			console.error('Error in local image conversion:', error);
			return null;
		}
	}

	/**
	 * Checks if there is at least one image in the clipboard
	 * @returns {Promise<boolean>} True if an image exists in clipboard, false otherwise
	 */
	static async hasImageInClipboard(): Promise<boolean> {
		try {
			// Check if the Clipboard API is available
			if (!navigator.clipboard || !navigator.clipboard.read) {
				console.log('Clipboard API not available in this browser');
				return false;
			}

			// Read clipboard contents
			const clipboardItems = await navigator.clipboard.read();

			// Use some to check if any of the types are image types
			return clipboardItems.some(item => item.types.some(type => type.startsWith('image/')));
		} catch (error: unknown) {
			// Handle permission denied or other errors
			if (error instanceof Error && error.name === 'NotAllowedError') {
				console.log('Clipboard access denied. User must grant permission.');
			} else {
				console.log('Error checking clipboard:', error);
			}
			return false;
		}
	}

	/**
	 * Converts:
	 *   \( ... \)  ->  $...$
	 *   \[ ... \]  ->  $$...$$
	 *
	 * while leaving code fences, inline code, and HTML comments untouched.
	 */
	static normalizeMathDelimiters(markdown: string): string {
		const placeholders = new Map<string, string>();
		let index = 0;

		const protect = (text: string): string => {
			const key = `\u0000MATH_PLACEHOLDER_${index++}\u0000`;
			placeholders.set(key, text);
			return key;
		};

		// ------------------------------------------------------------------
		// Protect fenced code blocks (``` or ~~~)
		// ------------------------------------------------------------------
		markdown = markdown.replace(
			/^([ \t]{0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm,
			protect
		);

		// ------------------------------------------------------------------
		// Protect inline code (`...`, ``...``, etc.)
		// ------------------------------------------------------------------
		markdown = markdown.replace(
			/(`+)([\s\S]*?[^`])\1/g,
			protect
		);

		// ------------------------------------------------------------------
		// Protect HTML comments
		// ------------------------------------------------------------------
		markdown = markdown.replace(
			/<!--[\s\S]*?-->/g,
			protect
		);

		// ------------------------------------------------------------------
		// Convert display math
		// ------------------------------------------------------------------
		markdown = markdown.replace(
			/\\\[\s*([\s\S]*?)\s*\\\]/g,
			(_, math: string) => `$$\n${math.trim()}\n$$`
		);

		// ------------------------------------------------------------------
		// Convert inline math
		// ------------------------------------------------------------------
		markdown = markdown.replace(
			/\\\(\s*([\s\S]*?)\s*\\\)/g,
			(_, math: string) => `$${math.trim()}$`
		);

		// ------------------------------------------------------------------
		// Restore protected regions
		// ------------------------------------------------------------------
		for (const [key, value] of placeholders) {
			markdown = markdown.replace(key, value);
		}

		return markdown;
	}

}
