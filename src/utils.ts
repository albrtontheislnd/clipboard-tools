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

	static localPathToPartialUrl(localFilePath: string): string {
		// Normalize paths to ensure consistent separators
		localFilePath = localFilePath.replace(/\\/g, '/');
		localFilePath = localFilePath.replace(/\/+/g, '/');
		localFilePath = localFilePath.replace(/^\/|\/$/g, '');
		localFilePath = localFilePath.replace(/[^a-zA-Z0-9\.-_\/]/g, '');
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

}