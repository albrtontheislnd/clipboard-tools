import { Editor, Notice } from 'obsidian';
import axios from 'axios';
import { stringOrEmptySchema } from './plugin_interfaces';
import { runImageWorker, tUtils } from './utils';

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
export async function uploadToOCRMarkdownify(blob: Blob, context: OCRPluginContext): Promise<OCRResponse> {
	const endpointUrl = `${context.settings.apiServer}/images/ocr-markdownify`;

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

export async function uploadToOCRAI(blob: Blob, context: OCRPluginContext): Promise<OCRResponse> {
	const endpointUrl = `${context.settings.apiServer}/images/ocr-ai`;

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

export async function uploadToOCRNative(blob: Blob, context: OCRPluginContext): Promise<OCRResponse> {
	const endpointUrl = `${context.settings.apiServer}/images/ocr-native`;

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

export async function uploadToOCRCompanion(blob: Blob, context: OCRPluginContext): Promise<OCRResponse> {
	const endpointUrl = `${context.settings.apiServer}/images/ocr-companion`;

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
 * Optimize image to WEBP format using a Web Worker with OffscreenCanvas.
 * Falls back to `optimizeImageToWebP()` on the main thread if the worker fails.
 */
export async function optimizeImageToWebPInWorker(blob: Blob): Promise<Blob> {
	const buffer = await blob.arrayBuffer();
	const result = await runImageWorker(
		{ operation: 'optimizeImage', buffer, type: blob.type, maxWidth: 1024, maxHeight: 1024 },
		'image/webp',
		() => tUtils.optimizeImageToWebP(blob)
	);
	if (!result) throw new Error('Image optimization failed');
	return result;
}

/**
 * Convert image to markdown text using OCR.
 */
export async function convertOCRMarkdownify(blob: Blob, context: OCRPluginContext): Promise<string> {
	try {
		// Optimize image to WEBP with size constraints (using web worker)
		const optimizedBlob = await optimizeImageToWebPInWorker(blob);

		// Upload to OCR endpoint
		const response = await uploadToOCRMarkdownify(optimizedBlob, context);

		// Handle response and return text
		return handleOCRResponse(response);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Error in convertImageToMarkdown:', error);
		return `Error processing image: ${errorMessage}`;
	}
}

export async function convertOCRAI(blob: Blob, context: OCRPluginContext): Promise<string> {
	try {
		// Upload to OCR endpoint
		const response = await uploadToOCRAI(blob, context);

		// Handle response and return text
		return handleOCRResponse(response);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Error in extractTextFromImage:', error);
		return `Error processing image: ${errorMessage}`;
	}
}

export async function convertOCRNative(blob: Blob, context: OCRPluginContext): Promise<string> {
	try {
		// Upload to Quick OCR endpoint
		const response = await uploadToOCRNative(blob, context);

		// Handle response and return text
		return handleOCRResponse(response);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Error in quickExtractTextFromImage:', error);
		return `Error processing image: ${errorMessage}`;
	}
}

export async function convertOCRCompanion(blob: Blob, context: OCRPluginContext): Promise<string> {
	try {
		// Upload to Quick OCR endpoint
		const response = await uploadToOCRCompanion(blob, context);

		// Handle response and return text
		return handleOCRResponse(response);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Error in convertOCRCompanion:', error);
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