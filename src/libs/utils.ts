export interface FilePathInfo {
  filename: string;
  fileUri: string;
}

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

			// Use some to check if any of the types are image/png
			return clipboardItems.some(item => item.types.includes("image/png"));
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
	 * Takes an absolute local file path (OS-agnostic), extracts the filename 
	 * without extension (with URL unescaping), and generates a standard file URI.
	 *
	 * @param absolutePath The OS-agnostic absolute file path (e.g., /path/to/file.txt or C:\path\to\file.txt)
	 * @returns An object containing the extracted filename and the generated file URI.
	 */
	static processFilePath(absolutePath: string): FilePathInfo {
		// Strip matching single or double quotes from the path
		absolutePath = absolutePath.replace(/^['"]|['"]$/g, '');

		// ====================================================================
		// 1. Extract filename without extension (OS-agnostic)
		// ====================================================================
		
		// Split path by either forward slash or backslash to handle both POSIX and Windows
		const pathSegments = absolutePath.split(/[/\\]/);
		const basename = pathSegments[pathSegments.length - 1] || '';
		
		let filename = basename;
		const dotIndex = basename.lastIndexOf('.');
		
		// If dotIndex > 0, strip the extension.
		// If dotIndex === 0, it's a hidden file with no extra extension (e.g., '.env' or '.bashrc')
		if (dotIndex > 0) {
			filename = basename.substring(0, dotIndex);
		}
		
		// URL unescaping for the extracted filename
		try {
			filename = decodeURIComponent(filename);
		} catch {
			// If it fails (e.g., a literal '%' that isn't a valid URI sequence), retain original
		}
		
		// ====================================================================
		// 2. Generate File URI (Based on Wikipedia: File URI scheme)
		// ====================================================================
		// Reference: https://en.wikipedia.org/wiki/File_URI_scheme
		
		// Normalize all backslashes to forward slashes
		let uriPath = absolutePath.replace(/\\/g, '/');
		
		let isUNC = false;
		let hostname = '';
		
		// Handle Windows UNC paths (e.g., \\server\share\file.ext -> //server/share/file.ext)
		if (uriPath.startsWith('//')) {
			isUNC = true;
			const parts = uriPath.split('/');
			// parts[0] = '', parts[1] = '', parts[2] = hostname
			hostname = parts[2] || '';
			// The remainder is the local path on the server
			uriPath = '/' + parts.slice(3).join('/');
		}
		
		// Percent-encode the path segments properly for the URI
		const segments = uriPath.split('/');
		const encodedSegments = segments.map((segment, index) => {
			// Standard File URI format preserves the Windows drive letter without encoding the colon.
			// (e.g., C:/ -> file:///C:/)
			if ((index === 0 || (index === 1 && segments[0] === '')) && /^[a-zA-Z]:$/.test(segment)) {
				return segment;
			}
			// Percent-encode other segments (handles spaces, #, ?, +, etc.)
			return encodeURIComponent(segment);
		});
		
		uriPath = encodedSegments.join('/');
		
		let fileUri = '';
		
		if (isUNC) {
			// 2-slash format for UNC paths (e.g., file://server/share/file.ext)
			fileUri = `file://${hostname}${uriPath}`;
		} else {
			// Local paths. Must have 3 slashes if no hostname (e.g., file:///path/to/file.ext)
			if (!uriPath.startsWith('/')) {
				uriPath = '/' + uriPath;
			}
			fileUri = `file://${uriPath}`;
		}
		
		return {
			filename,
			fileUri
		};
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