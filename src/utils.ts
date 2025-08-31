import { execFile } from "child_process";
import { promises as fs } from "fs";
import { promisify } from 'util';
import { App, FileSystemAdapter, TFile, Platform } from "obsidian";
import * as path from "path";
import { tSecureString } from "./secure";
import { AIModelSetting, ImgOptimizerPluginSettings } from "./interfaces";
import { ConfigValues } from "./settings";


/**
 * Executes a command-line process asynchronously and returns a promise
 * that resolves with the standard output and standard error.
 * 
 * @param {string} command - The command to execute.
 * @param {string[]} args - An array of string arguments to pass to the command.
 * @returns {Promise<{ stdout: string; stderr: string }>} - A promise that resolves
 * with an object containing `stdout` (the standard output) and `stderr` (the standard error).
 * If an error occurs during execution, the promise is rejected with an error message.
 */
function execFilePromise(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
	  execFile(command, args, (error, stdout, stderr) => {
		if (error) {
		  reject(`Error: ${error.message}\nStderr: ${stderr}`);
		} else {
		  resolve({ stdout, stderr });
		}
	  });
	});
}

export class tUtils {
	/**
	 * Maps a user-provided quality value from a scale of 1 to 100 to the AVIF quality scale of 1 to 63.
	 * The mapping is performed in reverse order, where a higher user quality corresponds to a lower AVIF quality.
	 * 
	 * @param {number} userQuality - The desired quality on a scale from 1 to 100.
	 * @returns {number} - The calculated AVIF quality on a scale from 1 to 63.
	 */
	static mapQualityToAvif(userQuality: number): number {
		return Math.max(1, 64 - Math.round(userQuality * 0.63));
	}

	/**
	 * Converts an image file to AVIF format using the specified command-line tool.
	 * 
	 * @param {string} progPath - The file path to the command-line tool (e.g., ffmpeg, magick, vips).
	 * @param {string} inputFilePath - The path to the input image file.
	 * @param {string} outputFilePath - The path where the converted image file should be saved.
	 * @param {number} quality - The desired quality level for the output image, on a scale of 1 to 100.
	 * @returns {Promise<{stdout: string, stderr: string, result: boolean}>} - A promise that resolves to an object containing
	 * the standard output, standard error, and a boolean result indicating success (true) or failure (false).
	 * If the conversion fails, the output and error messages are provided, and the result is false.
	 */
	static async convertImage(progPath: string, inputFilePath: string, outputFilePath: string, quality: number): Promise<{
		stdout: string, 
		stderr: string,
		result: boolean,
	}> {
		const appCheck = await tUtils.findProgPath(progPath);
		const app = path.basename(String(appCheck), Platform.isWin ? '.exe' : '').toLowerCase();
		let args;

		switch (app) {
			case 'ffmpeg':
				args = [
					'-i', inputFilePath,             // Input file path
					'-c:v', 'libaom-av1',        // AVIF codec
					'-crf', String(tUtils.mapQualityToAvif(quality)),  // Quality setting (Constant Rate Factor for AVIF)
					'-pix_fmt', 'yuv420p',			// Sets 4:2:0 chroma subsampling, which is compatible with most browsers
					'-y',                        // Overwrite output if it exists
					outputFilePath                   // Output file path
				  ];
				break;

			case 'magick':
				args = [inputFilePath, '-quality', `${quality}`, outputFilePath];
				break;

			case 'vips':
				// vips copy input.png output.avif[Q=80]
				args = [
					'copy',
					inputFilePath,
					`${outputFilePath}[Q=${quality.toString()}]`];
				break;

			default:
				// not a valid app
				return { stdout: '', stderr: '', result: false };
		}

		try {
			const { stdout, stderr } = await execFilePromise(progPath, args);
			const outputSize = (await fs.stat(outputFilePath)).size;
			if(outputSize === 0) {
				await fs.unlink(outputFilePath);
				throw new Error(`Zero-bytes file.`);
			}

			return {
				stdout: stdout,
				stderr: stderr,
				result: true,
			};
		} catch (error) {
			console.error(`${app.toUpperCase()} execution error:`, error);
			return { stdout: '', stderr: '', result: false };
		}
	}

	/**
	 * Converts an image file to AVIF format using the specified command-line tool and returns the data as ArrayBuffer.
	 * 
	 * @param {string} progPath - The file path to the command-line tool (e.g., ffmpeg, magick, vips).
	 * @param {string} inputFilePath - The path to the input image file.
	 * @param {number} quality - The desired quality level for the output image, on a scale of 1 to 100.
	 * @returns {Promise<{data: ArrayBuffer | null, stdout: string, stderr: string, result: boolean}>} - A promise that resolves to an object containing
	 * the AVIF data as ArrayBuffer (null on failure), standard output, standard error, and a boolean result indicating success (true) or failure (false).
	 */
	static async convertImageToBuffer(progPath: string, inputFilePath: string, quality: number): Promise<{
		data: ArrayBuffer | null,
		stdout: string, 
		stderr: string,
		result: boolean,
	}> {
		// Input validation
		if (quality < 1 || quality > 100) {
			return { 
				data: null,
				stdout: '', 
				stderr: `Quality must be between 1 and 100, got: ${quality}`, 
				result: false 
			};
		}

		// Check if input file exists
		try {
			await fs.access(inputFilePath);
		} catch {
			return { 
				data: null,
				stdout: '', 
				stderr: `Input file does not exist: ${inputFilePath}`, 
				result: false 
			};
		}

		const appCheck = await tUtils.findProgPath(progPath);
		const app = path.basename(String(appCheck), Platform.isWin ? '.exe' : '').toLowerCase();
		let args: string[];

		switch (app) {
			case 'ffmpeg':
				args = [
					'-i', inputFilePath,             // Input file path
					'-c:v', 'libaom-av1',           // AVIF codec
					'-crf', String(tUtils.mapQualityToAvif(quality)),  // Quality setting
					'-pix_fmt', 'yuv420p',          // 4:2:0 chroma subsampling
					//'-cpu-used', '4',               // Speed vs quality tradeoff
					//'-row-mt', '1',                 // Enable row-based multi-threading
					//'-f', 'avif',                   // Force AVIF format
					'pipe:1'                        // Output to stdout
				];
				break;

			case 'magick':
				args = [
					inputFilePath, 
					'-quality', `${quality}`,
					'avif:-'                        // Output AVIF to stdout
				];
				break;

			case 'vips':
				args = [
					'copy',
					inputFilePath,
					`.avif[Q=${quality.toString()}]`  // Output AVIF to stdout
				];
				break;

			default:
				return { 
					data: null,
					stdout: '', 
					stderr: `Unsupported application: ${app}`, 
					result: false 
				};
		}

		try {
			const execFilePromise2 = promisify(execFile);
			const { stdout, stderr } = await execFilePromise2(progPath, args, {
				encoding: 'buffer',  // Important: get raw binary data
				maxBuffer: 50 * 1024 * 1024  // 50MB buffer limit (adjust as needed)
			});

			// Check if we got any data
			if (!stdout || stdout.length === 0) {
				return {
					data: null,
					stdout: '',
					stderr: stderr?.toString() || 'No output data received',
					result: false
				};
			}

			// Convert Buffer to ArrayBuffer (ensure type is ArrayBuffer)
			const arrayBuffer: ArrayBuffer = Uint8Array.from(stdout).buffer;

			return {
				data: arrayBuffer,
				stdout: '', // stdout contains binary data, so we don't return it as text
				stderr: stderr?.toString() || '',
				result: true,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`${app.toUpperCase()} execution error:`, error);
			return { 
				data: null,
				stdout: '', 
				stderr: errorMessage, 
				result: false 
			};
		}
	}

	/**
	 * @description
	 * Checks if a given file path is an executable file with the given name
	 * and checks if it has execute permissions.
	 * 
	 * @param {string} filePath - The path to check.
	 * @returns {Promise<string | null>} - A promise that resolves to the file path if it
	 * is executable and has execute permissions, or null if the file does not exist,
	 * is not executable, or does not have execute permissions.
	 */
	static async findProgPath(filePath: string): Promise<string | null> {
		const execFile = path.basename(filePath, Platform.isWin ? '.exe' : '').toLowerCase();
		if (['magick', 'ffmpeg', 'vips'].includes(execFile)) {
			try {
				await fs.access(filePath, fs.constants.X_OK);
				return filePath;
			} catch {
				return null;
			}
		}
		return null;
	}

	/**
	 * Converts a given blob to a base64 encoded string.
	 * 
	 * @param blob - The blob to convert.
	 * @returns A promise that resolves to a base64 encoded string.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static async blobToBase64(blob: Blob): Promise<any> {
		return new Promise((resolve, reject) => {
		  const reader = new FileReader();
		  reader.onloadend = () => resolve(reader.result);
		  reader.onerror = reject;
		  reader.readAsDataURL(blob);
		});
	}

	/**
	 * @description
	 * Generates a random filename in the format `PastedImage_{ISODateTime}_{randomString}.{fileExtension}`,
	 * where `{ISODateTime}` is the current datetime in ISO format and `{randomString}` is a random 5-character string.
	 * If `fileExtension` is not provided, the filename will not have an extension.
	 * 
	 * @param {string} [fileExtension] - The file extension to use (e.g., 'png', 'jpg', etc.).
	 * @returns {string} - A random filename.
	 */
	static randomFilename(fileExtension: string = ''): string {
		// PastedImage_{randomString}_{ISODateTime}
		const randomString = Math.random().toString(36).slice(-5);
		const ISODateTime = new Date().toISOString().replace(/[:.-]/g, '');
		
		// fileExtension?
		fileExtension = (fileExtension.length > 0) ? `.${fileExtension.toLowerCase()}` : '';

		// return filename
		return `PastedImage_${ISODateTime}_${randomString}${fileExtension}`;
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
     * Given a blob, returns a resized version of the image as a blob or as a data URL.
     * 
     * @param blob - The blob to resize.
     * @param imageSpecs - An object containing the resizing parameters.
     * @param getResultAs - The format of the result. One of 'Blob', 'DataURL', or 'TFile'.
     * @param appRef - An optional reference to the app instance. Required if getResultAs is 'TFile'.
     * @returns A promise that resolves to the resized image as a blob, data URL, or TFile, or null if there was an error.
     */
    static async getImageData(blob: Blob, imageSpecs: {
        maxDimensions: number,
        maxPixels: number,
        format: 'png' | 'webp',  
    }, getResultAs: 'Blob' | 'ArrayBuffer' | 'Uint8Array' | 'TFile' | 'DataURL' | 'Base64',
		appRef?: App): Promise<null | Blob | TFile | string> {
		try {
            const img = await createImageBitmap(blob);
        
            // Define the resizing parameters
            const maxDimensions = imageSpecs.maxDimensions; // 1000px
            const maxPixels = imageSpecs.maxPixels; // 1 megapixel = 1000000
        
            let targetWidth = img.width;
            let targetHeight = img.height;
            const aspectRatio = img.width / img.height;
            
            // Calculate new dimensions within constraints
            if (targetWidth * targetHeight > maxPixels) {
              targetWidth = Math.min(maxDimensions, Math.sqrt(maxPixels * aspectRatio));
              targetHeight = Math.min(maxDimensions, Math.sqrt(maxPixels / aspectRatio));
            } else {
              targetWidth = Math.min(targetWidth, maxDimensions);
              targetHeight = Math.min(targetHeight, maxDimensions);
            }
        
            // Create an offscreen canvas and draw the resized image
            const offscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight);
            const ctx = offscreenCanvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            // Convert canvas to Blob
            const resizedBlob = await offscreenCanvas.convertToBlob({ type: `image/${imageSpecs.format}` });

            switch (getResultAs) {
                case 'Blob':
                    return resizedBlob;

                case 'DataURL':
                    // Convert Blob to base64 encoded data URL
                    const base64Data = (await tUtils.blobToBase64(resizedBlob)).toString();
                    return base64Data;

				case 'TFile':
					if (typeof appRef !== 'undefined') {
						const tempFilename = tUtils.randomFilename();
						const normalizedPath = await appRef.fileManager.getAvailablePathForAttachment(`${tempFilename}.${imageSpecs.format}`);
						const tempFile = await appRef.vault.createBinary(normalizedPath, <ArrayBuffer> (await resizedBlob.arrayBuffer()));
						
						if(tempFile.stat.size > 0) {
							return tempFile;
						} else {
							await appRef.fileManager.trashFile(tempFile);
						}
					}
					return null;

				case 'Base64':
					const _base64Data = (await tUtils.blobToBase64(resizedBlob)).toString();
					return _base64Data.split(',')[1];
                default:
                    return null;
            }
          } catch (error) {
            console.error("Error processing clipboard image:", error);
            return null;
          }
    }

	static getAbsoluteVaultPath(app: App) {
		try {
			const adapter = <FileSystemAdapter> app.vault.adapter;
			return adapter.getFullPath(app.vault.getRoot().path);
		} catch {
			return null;
		}
	}

	static async getRawApiKey(settingKey: string, _app: App, settings: ImgOptimizerPluginSettings): Promise<string> {
		const h = String(settings.aiModelAPIKeys[settingKey]);
		const s = settingKey;
		const p = settings.salt;
		
		try {
			const v = await tSecureString.decrypt(h, p, s);
			return v ?? '';
		} catch {
			return '';
		}
	}

	static async encodeRawApiKey(originalApiKey: string, settingKey: string, _app: App, settings: ImgOptimizerPluginSettings): Promise<string> {
		originalApiKey = originalApiKey.trim();
		const p = settings.salt;
		const s = settingKey;
		
		try {
			const v = await tSecureString.encrypt(originalApiKey, p, s);
			return v ?? '';
		} catch {
			return '';
		}
	}

	static splitAtFirst(input: string, separator: string = '/'): [string | undefined, string | undefined] {
		const [firstPart, ...rest] = input.split(separator);
		return rest.length > 0 ? [firstPart, rest.join("/")] : [undefined, undefined];
	  }

	static async generateApiKeyFields(settings: ImgOptimizerPluginSettings, app: App): Promise<AIModelSetting[]> {
		const apiKeysFields: AIModelSetting[] = [];

		for (const item of ConfigValues.aiModels) {
			const settingKey = `${item.platform_id}/${item.model_id}`;
			const rawApiKey = await tUtils.getRawApiKey(settingKey, app, settings);

			apiKeysFields.push({
				...item,
				settingKey: settingKey,
				rawApiKey: rawApiKey,
			});
		  }

		// sort
		apiKeysFields.sort((a, b) => a.settingKey.localeCompare(b.settingKey));


		return apiKeysFields;
	}
 }