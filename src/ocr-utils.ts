import { Editor, Notice } from 'obsidian';
import axios from 'axios';
import { stringOrEmptySchema } from './interfaces';
import { tUtils } from './utils';

interface OCRResponse {
	success: boolean;
	errors?: string;
	messages?: string;
	result?: {
		text: string;
	};
}

export interface OCRPluginContext {
	settings: {
		apiServer: string;
	};
}

/**
 * Handle OCR API response and return text.
 */
export function handleOCRResponse(response: OCRResponse): string {
	try {
		if (response.success === true && response.result?.text) {
			return response.result.text;
		} else if (response.errors) {
			return `OCR Error: ${response.errors}`;
		} else {
			return 'OCR Error: Unknown error occurred';
		}
	} catch (error) {
		return `OCR Response Error: ${error instanceof Error ? error.message : 'Invalid response format'}`;
	}
}

/**
 * Upload optimized image to OCR endpoint.
 */
export async function uploadToOCREndpoint(blob: Blob, context: OCRPluginContext): Promise<OCRResponse> {
	const endpointUrl = `${context.settings.apiServer}/images/ocr`;

	const formData = new FormData();
	formData.append('image', blob, 'image.webp');

	const response = await axios.post(endpointUrl, formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
		responseType: 'json',
	});

	return response.data;
}

export async function uploadToOCRVisionEndpoint(blob: Blob, context: OCRPluginContext): Promise<OCRResponse> {
	const endpointUrl = `${context.settings.apiServer}/images/ocr-vision`;

	const formData = new FormData();
	formData.append('image', blob, 'image.png');

	const response = await axios.post(endpointUrl, formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
		responseType: 'json',
	});

	return response.data;
}

/**
 * Optimize image to WEBP format with size constraints (max 1024x1024).
 */
export async function optimizeImageToWebP(blob: Blob): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		img.onload = () => {
			try {
				// Calculate dimensions keeping aspect ratio, max 1024x1024
				let { width, height } = img;

				if (width > 1024 || height > 1024) {
					const aspectRatio = width / height;
					if (width > height) {
						width = 1024;
						height = Math.floor(1024 / aspectRatio);
					} else {
						height = 1024;
						width = Math.floor(1024 * aspectRatio);
					}
				}

				// Set canvas size (ensure integer values)
				canvas.width = Math.floor(width);
				canvas.height = Math.floor(height);

				// Draw and convert to WEBP
				ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

				canvas.toBlob((webpBlob) => {
					if (webpBlob) {
						resolve(webpBlob);
					} else {
						reject(new Error('Failed to convert image to WEBP'));
					}
				}, 'image/webp', 0.8); // 80% quality
			} catch (error) {
				reject(error);
			}
		};

		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = URL.createObjectURL(blob);
	});
}

/**
 * Convert image to markdown text using OCR.
 */
export async function convertImageToMarkdown(blob: Blob, context: OCRPluginContext): Promise<string> {
	try {
		// Optimize image to WEBP with size constraints
		const optimizedBlob = await optimizeImageToWebP(blob);

		// Upload to OCR endpoint
		const response = await uploadToOCREndpoint(optimizedBlob, context);

		// Handle response and return text
		return handleOCRResponse(response);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Error in convertImageToMarkdown:', error);
		return `Error processing image: ${errorMessage}`;
	}
}

export async function extractTextFromImage(blob: Blob, context: OCRPluginContext): Promise<string> {
	try {
		// Upload to OCR endpoint
		const response = await uploadToOCRVisionEndpoint(blob, context);

		// Handle response and return text
		return handleOCRResponse(response);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Error in extractTextFromImage:', error);
		return `Error processing image: ${errorMessage}`;
	}
}

/**
 * Insert content into editor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertContent(editor: Editor, _filePath: any = undefined, _textContent: any = undefined, _cursor: "from" | "to" | "head" | "anchor" | null = null): Promise<void> {
	// Parse both inputs at once to avoid multiple schema validations
	const [filePath, textContent] = await Promise.all([
		stringOrEmptySchema.parse(_filePath),
		stringOrEmptySchema.parse(_textContent)
	]);

	let content = '';

	if (filePath.length > 0) {
		if(tUtils.isValidHttpUrl(filePath)) { // http/https file path
			content += `\n![](${filePath})\n`;
		} else { // a local file path
			content += `\n![[${filePath}]]\n`;
		}

		new Notice(`Image saved as ${filePath}`);
	}

	if (textContent.length > 0) {
		content += `\n${textContent}\n`;
	}

	// Single editor operation instead of multiple
	if (content) {
		if(_cursor === null) {
			editor.replaceSelection(content);
		} else {
			editor.replaceRange(content, editor.getCursor(_cursor));
		}

	}
}
