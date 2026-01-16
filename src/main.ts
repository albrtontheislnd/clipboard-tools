import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from 'obsidian';
import axios from 'axios';
import { tUtils } from './utils';
import { DEFAULT_SETTINGS, ImgOptimizerPluginSettingsTab } from './settings';
import { ImgOptimizerPluginSettings } from './interfaces';
import { ImageTextModal } from './modals/aiprompt_modal';
import { ChangeCaseModal } from './modals/changecase_modal';
import { LoadingModal } from './loadingmodal';
import { convertImageToMarkdown, extractTextFromImage, insertContent } from './ocr-utils';
import * as path from 'path';
import { registerContextMenu } from './contextmenu';
import { zhongwenTasks } from './zhongwen';
import { appendToPromptCallout, getPromptCallouts, replacePromptCallout } from './libs/prompt-parser';
import { LatexInputModal } from './modals/latex_modal';

export default class ImgWebpOptimizerPlugin extends Plugin {
	settings?: ImgOptimizerPluginSettings;
	locked: boolean = false;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	  }
	
	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		this.app.workspace.onLayoutReady(async () => {
			await this.loadSettings();
			this.addSettingTab(new ImgOptimizerPluginSettingsTab(this.app, this));

			// This adds an editor command that can perform some operation on the current editor instance
			this.addCommand({
				id: 'paste-optimized-img',
				name: 'Embed clipboard image in WEBP/AVIF/PNG/JPEG format',
				editorCallback: async (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
					if (view instanceof MarkdownView) {
						// Handle the case where ctx is a MarkdownFileInfo
						await this.handleClipboardImage(editor, view);
					}
				}
			});

			this.addCommand({
				id: 's3-optimized-img',
				name: 'Optimize and save to S3 Storage',
				editorCallback: async (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
					if (view instanceof MarkdownView) {
						// Handle the case where ctx is a MarkdownFileInfo
						await this.handleClipboardImage(editor, view, true);
					}
				}
			});

			this.addCommand({
				id: 'ai-convert-md',
				name: 'Convert clipboard image to Markdown/Latex',
				editorCallback: async (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
					if (view instanceof MarkdownView) {
						// Handle the case where ctx is a MarkdownFileInfo
						await this.handleOCR(editor);
					}
				}
			});

			this.addCommand({
				id: 'extract-text-image',
				name: 'Extract text from Image',
				editorCallback: async (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
					if (view instanceof MarkdownView) {
						// Handle the case where ctx is a MarkdownFileInfo
						await this.handleOCR(editor, true);
					}
				}
			});

			// editor-menu
			this.registerEvent(
				this.app.workspace.on('editor-menu', (menu, editor, view) => {
					if (view instanceof MarkdownView) {

						menu.addItem((item) => {
							item.setTitle(`Alapaki: Embed (${this.settings?.imageFormat.toUpperCase()})`).setIcon('image-plus')
								.onClick(async () => await this.handleClipboardImage(editor, view));
						});

						menu.addItem((item) => {
							item.setTitle(`Alapaki: Save to S3 (${this.settings?.imageFormat.toUpperCase()})`).setIcon('image-plus')
								.onClick(async () => await this.handleClipboardImage(editor, view, this.settings?.useS3Storage));
						});

						menu.addItem((item) => {
							item.setTitle(`Alapaki: Markdownify`).setIcon('brain-circuit')
								.onClick(async () => await this.handleOCR(editor));
						});

						menu.addItem((item) => {
							item.setTitle(`Alapaki: OCR`).setIcon('brain-circuit')
								.onClick(async () => await this.handleOCR(editor, true));
						});

						menu.addItem((item) => {
							item.setTitle(`Alapaki: Summarize`).setIcon('clipboard-pen-line')
								.onClick(async () => await this.handleSummarize(editor));
						});

						menu.addItem((item) => {
							item.setTitle(`Alapaki: Latex Editor`).setIcon('clipboard-pen-line')
								.onClick(async () => await this.handleLatexInput(editor));
						});

						// register submenu:
						registerContextMenu(menu, editor, view, this.handleWrapCallout.bind(this), this.handleChangeCase.bind(this), this.handleZhongwen.bind(this), this.handlePromptCallouts.bind(this));
					}
				})
			);
		});
	}

	/**
	 * Converts an image blob to the specified format and compression level,
	 * and either uploads it to S3 or saves it locally.
	 * @param blob - The image blob to process.
	 * @param forceS3Upload - If true, forces the image to be uploaded to S3.
	 * @returns A promise that resolves to a string containing the S3 URL or local file path,
	 * or null on error.
	 */
	async convertWrapper(blob: Blob, forceS3Upload: boolean = false): Promise<string | null> {

		const defaultImageFormat = 'avif';
		const defaultCompressionLevel = 70;
		const imageFormat = this.settings?.imageFormat || defaultImageFormat;

		try {
			// Check if we should use native browser conversion for supported formats
			const useNativeConversion = ['webp', 'jpeg', 'jpg', 'png'].includes(imageFormat.toLowerCase());

			if (useNativeConversion && !forceS3Upload) {
				// Use native Web Browser API for local conversion
				const convertedBlob = await tUtils.convertImageLocally(blob, imageFormat, this.settings?.compressionLevel || defaultCompressionLevel);
				if (!convertedBlob) {
					new Notice('Failed to convert image locally');
					return null;
				}

				// Save the converted blob locally
				const arrayBuffer = await convertedBlob.arrayBuffer();
				const fileExtension = imageFormat === 'jpeg' ? 'jpg' : imageFormat;
				const randomFilename = tUtils.randomFilename(fileExtension);

				const filePath = await this.app.fileManager.getAvailablePathForAttachment(randomFilename);
				const file = await this.app.vault.createBinary(filePath, arrayBuffer);

				return file.path;
			} else if (useNativeConversion && forceS3Upload) {
				// Convert locally first, then upload to S3
				const convertedBlob = await tUtils.convertImageLocally(blob, imageFormat, this.settings?.compressionLevel || defaultCompressionLevel);
				if (!convertedBlob) {
					new Notice('Failed to convert image locally for S3 upload');
					return null;
				}

				// Create S3 path
				const local_path = path.dirname(await this.app.fileManager.getAvailablePathForAttachment('file.bin'));
				const s3_path = `${tUtils.slugifyVaultName(this.app.vault.getName())}/${tUtils.localPathToPartialUrl(local_path)}/${tUtils.randomFilename(imageFormat === 'jpeg' ? 'jpg' : imageFormat)}`;

				// Create FormData for S3 uploads (multipart/form-data with file upload)
				const formData = new FormData();
				formData.append('image', convertedBlob, `image.${imageFormat === 'jpeg' ? 'jpg' : imageFormat}`); // Attach converted blob as file
				formData.append('s3_path', s3_path);

				// Make the HTTP POST request using axios with FormData
				const endpointUrl = `${this.settings?.apiServer}/images/save_s3`;
				const response = await axios.post(endpointUrl, formData, {
					headers: {
						'Content-Type': 'multipart/form-data',
					},
					responseType: 'json',
				});

				// Handle the JSON response
				const responseData = response.data as {
					success: boolean;
					errors?: string;
					messages?: string;
					result?: { url: string };
				};

				if (responseData.success === true && responseData.result?.url) {
					console.log(`S3 upload successful: ${responseData.messages || 'Image uploaded'}`);
					return responseData.result.url;
				} else {
					const errorMsg = responseData.errors || 'Unknown S3 upload error';
					console.error('S3 upload failed:', errorMsg);
					new Notice(`S3 upload failed: ${errorMsg}`);
					return null;
				}
			} else {
				// For AVIF or other formats, use the existing API logic
				if (!forceS3Upload) {
					// Local upload: use multipart/form-data with file upload
					const endpointUrl = `${this.settings?.apiServer}/images/transform_download`;

					// Create FormData for local uploads (multipart/form-data with file upload)
					const formData = new FormData();
					formData.append('image', blob, 'image.png'); // Attach blob as file
					formData.append('format_to', imageFormat);
					formData.append('quality', (this.settings?.compressionLevel || defaultCompressionLevel).toString());

					// Make the HTTP POST request using axios with FormData
					const response = await axios.post(endpointUrl, formData, {
						headers: {
							'Content-Type': 'multipart/form-data',
						},
						responseType: 'arraybuffer', // Response will be binary image data
					});

					// For local storage, response should be binary image data directly
					try {
						// Use response data directly as ArrayBuffer (binary image data)
						const imageBuffer = response.data as ArrayBuffer;

						const fileExtension = imageFormat === 'jpeg' ? 'jpg' : imageFormat;
						const randomFilename = tUtils.randomFilename(fileExtension);

						const filePath = await this.app.fileManager.getAvailablePathForAttachment(randomFilename);
						const file = await this.app.vault.createBinary(filePath, imageBuffer);

						return file.path;
					} catch (parseError) {
						console.error('Failed to save binary response:', parseError);
						new Notice('Failed to save the processed image');
						return null;
					}
				} else {
					// S3 upload: use multipart/form-data with JSON response
					const endpointUrl = `${this.settings?.apiServer}/images/transform_save_s3`;

					// Create S3 path
					const local_path = path.dirname(await this.app.fileManager.getAvailablePathForAttachment('file.bin'));
					const s3_path = `${tUtils.slugifyVaultName(this.app.vault.getName())}/${tUtils.localPathToPartialUrl(local_path)}/${tUtils.randomFilename()}`;

					// Create FormData for S3 uploads (multipart/form-data with file upload)
					const formData = new FormData();
					formData.append('image', blob, 'image.png'); // Attach blob as file
					formData.append('format_to', imageFormat);
					formData.append('quality', (this.settings?.compressionLevel || defaultCompressionLevel).toString());
					formData.append('s3_path', s3_path);

					// Make the HTTP POST request using axios with FormData
					const response = await axios.post(endpointUrl, formData, {
						headers: {
							'Content-Type': 'multipart/form-data',
						},
						responseType: 'json', // Server returns JSON response for S3
					});

					// For S3 upload, handle the JSON response
					try {
						const responseData = response.data as {
							success: boolean;
							errors?: string;
							messages?: string;
							result?: { url: string };
						};

						if (responseData.success === true && responseData.result?.url) {
							// Success - return the S3 URL
							console.log(`S3 upload successful: ${responseData.messages || 'Image uploaded'}`);
							return responseData.result.url;
						} else {
							// Handle API errors
							const errorMsg = responseData.errors || 'Unknown S3 upload error';
							console.error('S3 upload failed:', errorMsg);
							new Notice(`S3 upload failed: ${errorMsg}`);
							return null;
						}
					} catch (parseError) {
						console.error('Failed to parse S3 response as JSON:', parseError);
						new Notice('Failed to parse S3 upload response');
						return null;
					}
				}
			}

		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('Error processing image:', error);
			new Notice(`Failed to process image: ${errorMessage}`);
			return null;
		}
	}




	/**
	 * Handles the OCR clipboard action.
	 * Checks if the clipboard has any PNG images, and if so,
	 * processes them using the OCR endpoint to extract text.
	 * Shows a modal to confirm the extracted text and allow the user to
	 * include the image in the markdown if desired.
	 */
    async handleOCR(editor: Editor, extractText: boolean = false) {
		const clipboardItems = await navigator.clipboard.read();

		if(this.locked) {
			new Notice(`Image Conversion in Progress: Please hold on for a moment`);
			return;
		} else if(!clipboardItems) {
			new Notice(`Clipboard is empty`);
			return;
		}

		const context = { settings: { apiServer: this.settings?.apiServer || '' } };
		const promises = clipboardItems
			.filter(item => item.types.includes("image/png"))
			.map(async (item) => {
				const blob = await item.getType("image/png");
				let resultText = '';
				if(extractText) {
					resultText = await extractTextFromImage(blob, context);
				} else {
					resultText = await convertImageToMarkdown(blob, context);
				}

				const modal = new ImageTextModal(this.app, {
					imageSrc: blob,
					resultText: resultText,
				});

				const result = await modal.openWithPromise();

				if (result) {
					const filePath = result.includeImage ? await this.convertWrapper(blob, this.settings?.useS3Storage) : null;
					await insertContent(editor, filePath, result.textContent);
				}
			});

		this.locked = true;
		const modal = new LoadingModal(this.app);
		modal.status = 'OCR-ing...';
    	modal.open();

		await Promise.all(promises);
		this.locked = false;
		modal.close();
    }

	/**
	 * Summarizes the currently selected text using the text generator API.
	 */
	async handleSummarize(editor: Editor) {
		const selectedText = editor.getSelection().trim();

		if (selectedText.length == 0) {
			new Notice("No text selected");
			return;
		} else if (this.locked) {
			new Notice(`Image Conversion in Progress: Please hold on for a moment`);
			return;
		} else {
			const msg = `Summarizing text...`;
			console.log(msg);
			new Notice(msg);
		}

		this.locked = true;
    	const modal = new LoadingModal(this.app);
		modal.status = 'Summarizing text...';
    	modal.open();

		try {
			const endpointUrl = `${this.settings?.apiServer}/text/generator`;

			const requestBody = {
				prompt: "Summarize the provided Markdown text into concise, key bullet points. Focus on capturing the main ideas, key steps, or critical information. Aim for brevity, while retaining the essential meaning.",
				providedText: selectedText,
				system: "You are a helpful research assistant that provides clear, concise summaries of text content."
			};

			const response = await axios.post(endpointUrl, requestBody, {
				headers: {
					'Content-Type': 'application/json',
				},
				responseType: 'json',
			});

			const responseData = response.data as {
				success: boolean;
				errors?: string;
				messages?: string;
				result?: { text: string };
			};

			let resultText = '';
			if (responseData.success === true && responseData.result?.text) {
				resultText = responseData.result.text;
			} else if (responseData.errors) {
				resultText = `Text generation error: ${responseData.errors}`;
			} else {
				resultText = 'Text generation error: Unknown error occurred';
			}

			// Insert the returned text below the original selection
			await insertContent(editor, null, resultText, "to");

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('Error in text generation:', error);
			const errorText = `Error generating summary: ${errorMessage}`;
			await insertContent(editor, null, errorText, "to");
		}

		this.locked = false;
		modal.close();
	}

	async handleZhongwen(editor: Editor , tasks: 'grammar' | 'word-usage-en' | 'word-usage-vi' | 'explain') {
		const selectedText = editor.getSelection().trim();

		if (selectedText.length == 0) {
			new Notice("No text selected");
			return;
		} else if (this.locked) {
			new Notice(`Image Conversion in Progress: Please hold on for a moment`);
			return;
		} else {
			const msg = `Analyzing text...`;
			console.log(msg);
			new Notice(msg);
		}

		this.locked = true;
    	const modal = new LoadingModal(this.app);
		modal.status = 'Analyzing text...';
    	modal.open();

		try {
			const endpointUrl = `${this.settings?.apiServer}/text/zhongwen`;
			const { prompt: zh_prompt, system: zh_system } = zhongwenTasks(tasks, selectedText);

			const requestBody = {
				prompt: zh_prompt,
				providedText: '',
				system: zh_system
			};

			const response = await axios.post(endpointUrl, requestBody, {
				headers: {
					'Content-Type': 'application/json',
				},
				responseType: 'json',
			});

			const responseData = response.data as {
				success: boolean;
				errors?: string;
				messages?: string;
				result?: { text: string };
			};

			let resultText = '';
			if (responseData.success === true && responseData.result?.text) {
				resultText = responseData.result.text;
			} else if (responseData.errors) {
				resultText = `Text generation error: ${responseData.errors}`;
			} else {
				resultText = 'Text generation error: Unknown error occurred';
			}

			// Insert the returned text below the original selection
			await insertContent(editor, null, resultText, "to");

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('Error in text generation:', error);
			const errorText = `Error generating summary: ${errorMessage}`;
			await insertContent(editor, null, errorText, "to");
		}

		this.locked = false;
		modal.close();
	}

	/**
	 * Handles the Clipboard Image action.
	 * Checks if the clipboard has any PNG images, and if so,
	 * processes them using the image conversion endpoint to convert them to markdown.
	 * Shows a modal to indicate progress.
	 * @param {Editor} editor - The active editor.
	 * @param {MarkdownView} _view - The active markdown view.
	 * @param {boolean} forceS3Upload - Optional. If true, forces the image to be uploaded to S3 instead of local storage.
	 */
    async handleClipboardImage(editor: Editor, _view: MarkdownView, forceS3Upload: boolean = false) {
		const clipboardItems = (await navigator.clipboard.read()).filter(item => item.types.includes("image/png"));

		if(this.locked) {
			new Notice(`Image Conversion in Progress: Please hold on for a moment`);
			return;
		} else if(clipboardItems.length == 0) {
			new Notice(`Clipboard is empty`);
			return;
		}

		const promises = clipboardItems
			.map(async (item) => {
				const blob = await item.getType("image/png");
				const filePath = await this.convertWrapper(blob, forceS3Upload);
				await insertContent(editor, filePath);
			});

		this.locked = true;
    	const modal = new LoadingModal(this.app);
		modal.status = 'Transforming...';
    	modal.open();

		await Promise.all(promises);
		
		this.locked = false;
		modal.close();
    }
	
	/**
	 * Handles the Change Case action.
	 * Shows a modal to allow the user to select the desired case conversion.
	 * Replaces the selected text with the converted text if the modal is closed with a result.
	 * @param {Editor} editor - The active editor.
	 */
    async handleChangeCase(editor: Editor) {
		const selectedText = editor.getSelection();

		if (selectedText.trim().length == 0) {
			new Notice('No text selected to change case.');
			return;
		}

		const modal = new ChangeCaseModal(this.app, {
			selectedText: selectedText, 
		});

		const result = await modal.openWithPromise();
		if (result) { // Simplified null check
			editor.replaceSelection(result.textContent);
		}
    }

    async handleLatexInput(editor: Editor) {
		const selectedText = editor.getSelection();

		const modal = new LatexInputModal(this.app, {
			selectedText: selectedText, 
		});

		const result = await modal.openWithPromise();
		if (result) { // Simplified null check
			editor.replaceSelection(result.textContent);
		}
    }

	/**
	 * Handles the Wrap Callout action.
	 * Replaces the selected text with a callout block if the selected text is not already a callout.
	 * Shows a notice if no text is selected or if the selected text is already a callout.
	 * @param {Editor} editor - The active editor.
	 * @param {MarkdownView} _view - The active Markdown view.
	 */
    async handleWrapCallout(editor: Editor, _view: MarkdownView) {
		  // Get the active Markdown view
		  if (!_view) {
			new Notice("No active Markdown editor found.");
			return;
		  }
		
		  const selectedText = editor.getSelection();
		
		  // If no text is selected, show a notice
		  if (!selectedText) {
			new Notice("Please select some text to wrap in a callout.");
			return;
		  }
		
		  // Check if the selected text is already a callout
		  const isAlreadyCallout = selectedText.trimStart().startsWith("> [!");
		  if (isAlreadyCallout) {
			new Notice("The selected text is already a callout.");
			return;
		  }
		
		  // Define the callout block
		  const calloutType = "info";
		  const calloutContent = `> [!${calloutType}]\n> ${selectedText.replace(/\n/g, "\n> ")}`;
		
		  // Replace the selected text with the callout block
		  editor.replaceSelection(calloutContent);
    }

    async handlePromptCallouts() {
		if(this.locked) {
			new Notice(`Image Conversion in Progress: Please hold on for a moment`);
			return;
		}

		// Get all the prompts
		const prompts = getPromptCallouts(this.app);

		// loop through prompts' members
		for (const [uuid, prompt] of Object.entries(prompts)) {

			// lock
			this.locked = true;
			const modal = new LoadingModal(this.app);
			modal.status = 'Reasoning...';
			modal.open();

			// start the job
			const endpointUrl = `${this.settings?.apiServer}/text/generator`;
			const requestBody = {
				prompt: prompt,
				providedText: '',
				system: `You are a helpful research assistant.
Output your answer in Markdown format.
For section headers, include the header text as plain text **without using Markdown heading syntax** (do not use \`#\`, \`##\`, etc.).
**Do not use horizontal rules** (\`---\`, \`***\`, or similar).
Visually separate sections using spacing and/or bold text only.`
			};

			try {
				const response = await axios.post(endpointUrl, requestBody, {
					headers: {
						'Content-Type': 'application/json',
					},
					responseType: 'json',
				});

				const responseData = response.data as {
					success: boolean;
					errors?: string;
					messages?: string;
					result?: { text: string };
				};

				let resultText = '';
				if (responseData.success === true && responseData.result?.text) {
					resultText = responseData.result.text;
					replacePromptCallout(this.app, uuid, resultText);
				} else if (responseData.errors) {
					resultText = `❌ Text generation error: ${responseData.errors}`;
					appendToPromptCallout(this.app, uuid, resultText);
				} else {
					resultText = '❌ Text generation error: Unknown error occurred';
					appendToPromptCallout(this.app, uuid, resultText);
				}

			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				console.log('Error in text generation:', error);
				const errorText = `❌ Error generating response: ${errorMessage}`;
				appendToPromptCallout(this.app, uuid, errorText);
			}

			// release the lock
			this.locked = false;
			modal.close();
		}		
    }
}
