import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import axios from 'axios';
import { tUtils } from './utils';
import { ConfigValues, DEFAULT_SETTINGS, ImgOptimizerPluginSettingsTab } from './settings';
import { AIModel, ImgOptimizerPluginSettings, stringOrEmptySchema } from './interfaces';
import { ImageTextModal } from './aiprompt_modal';
import { createModelInstance } from './aiprompt';
import { ChangeCaseModal } from './changecase_modal';


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

			// editor-menu
			this.registerEvent(
				this.app.workspace.on('editor-menu', (menu, editor, view) => {
					if (view instanceof MarkdownView) {
						menu.addItem((item) => {
							item.setTitle(`Clipboard: Change Case`).setIcon('case-sensitive')
								.onClick(async () => await this.handleChangeCase(editor, view));
						});

						menu.addItem((item) => {
							item.setTitle(`Clipboard: as Callout`).setIcon('wrap-text')
								.onClick(async () => await this.handleWrapCallout(editor, view));
						});

						menu.addItem((item) => {
							item.setTitle(`Clipboard: Embed as ${this.settings?.imageFormat.toUpperCase()}`).setIcon('image-plus')
								.onClick(async () => await this.handleClipboardImage(editor, view));
						});

						menu.addItem((item) => {
							item.setTitle(`Clipboard: Upload ${this.settings?.imageFormat.toUpperCase()} image to S3`).setIcon('image-plus')
								.onClick(async () => await this.handleClipboardImage(editor, view, this.settings?.useS3Storage));
						});

						menu.addItem((item) => {
							item.setTitle(`Clipboard: Image 2 Markdown`).setIcon('brain-circuit')
								.onClick(async () => await this.handleOCR(editor, view));
						});

						menu.addItem((item) => {
							item.setTitle(`Clipboard: Summarize`).setIcon('clipboard-pen-line')
								.onClick(async () => await this.handleSummarize(editor));
						});
					}
				})
			);
		});
	}

	async convertWrapper(blob: Blob, forceS3Upload: boolean = false): Promise<string | null> {

		const defaultImageFormat = 'avif';
		const defaultCompressionLevel = 70;

		try {
			if (!forceS3Upload) {
				// Local upload: use multipart/form-data with file upload
				const endpointUrl = `${this.settings?.apiServer}/images/transform_download`;

				// Create FormData for local uploads (multipart/form-data with file upload)
				const formData = new FormData();
				formData.append('image', blob, 'image.png'); // Attach blob as file
				formData.append('format_to', this.settings?.imageFormat || defaultImageFormat);
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

					const fileExtension = this.settings?.imageFormat || defaultImageFormat;
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
				const local_path = await this.app.fileManager.getAvailablePathForAttachment('img');
				const s3_path = `${tUtils.slugifyVaultName(this.app.vault.getName())}/${tUtils.localPathToPartialUrl(local_path)}/${tUtils.randomFilename()}`;

				// Create FormData for S3 uploads (multipart/form-data with file upload)
				const formData = new FormData();
				formData.append('image', blob, 'image.png'); // Attach blob as file
				formData.append('format_to', this.settings?.imageFormat || defaultImageFormat);
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

		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('Error processing image with API:', error);
			new Notice(`Failed to process image: ${errorMessage}`);
		}

		// if error
		return null;
	}

	/**
	 * Return the AI model instance and its API key from the settings.
	 * @returns a tuple of the AI model instance and the API key.
	 * The AI model instance is undefined if the model specified in the settings is not found.
	 */
	async obtainAIModelInfo(): Promise<{ aiModel: AIModel | undefined, aiModel_APIKey: string }> {
		const findAIModel = (): AIModel | undefined => {		
			const [platformId, modelId] = tUtils.splitAtFirst(this.settings?.aiModel as string, '/');
			if(!platformId || !modelId) return undefined;
			return ConfigValues.aiModels.find(item => item.model_id === modelId && item.platform_id === platformId);
		};

		const aiModel = findAIModel();
		const aiModel_APIKey = await tUtils.getRawApiKey(`${aiModel?.platform_id}/${aiModel?.model_id}`, this.app, this.settings as ImgOptimizerPluginSettings);
		return {
			aiModel: aiModel,
			aiModel_APIKey: aiModel_APIKey
		};
	}

    async convertImageToMarkdown(blob: Blob): Promise<string | null> {
		const { aiModel, aiModel_APIKey } = await this.obtainAIModelInfo();
		let resultText = '';

		try {
			if(aiModel === undefined) throw "AI Model not found.";
			if (aiModel_APIKey.length === 0) throw "AI Model API Key not found.";

			// success!
			const msg = `Interacting with ${aiModel.model_id}`;
			console.log(msg);
			new Notice(msg);

			const modelInstance = createModelInstance(aiModel!, aiModel_APIKey, this.app);
			modelInstance.init();
			await modelInstance.addImage(blob);
			resultText = await modelInstance.taskOCR();
		} catch (error) {
			console.log(error);
			resultText = `Error in calling AI Model: ${aiModel?.model_id || 'Unknown'}.\n${error}`;
		}

		return resultText;
    }


	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async insertContent(editor: Editor, _filePath: any = undefined, _textContent: any = undefined, _cursor: "from" | "to" | "head" | "anchor" | null = null): Promise<void> {
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

	/**
	 * Handles the conversion of images from the clipboard to markdown using AI models.
	 * 
	 * This method reads images from the clipboard, processes each image using the specified AI model,
	 * and presents the result in a modal. If the conversion is successful, the image and/or the resulting
	 * text can be embedded into the current markdown editor.
	 * 
	 * The method checks if any image conversion is already in progress, and notifies the user if the
	 * clipboard is empty or if an AI model interaction fails.
	 * 
	 * @param editor - The markdown editor where the image and text will be embedded.
	 * @param _view - The markdown view associated with the editor.
	 */
     
	// TODO: fix
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleOCR(editor: Editor, _view: MarkdownView) {
		const clipboardItems = await navigator.clipboard.read();

		if(this.locked) {
			new Notice(`Image Conversion in Progress: Please hold on for a moment`);
			return;
		} else if(!clipboardItems) {
			new Notice(`Clipboard is empty`);
			return;
		}

		const promises = clipboardItems
			.filter(item => item.types.includes("image/png"))
			.map(async (item) => {
				const blob = await item.getType("image/png");
				const resultText = await this.convertImageToMarkdown(blob);

				const modal = new ImageTextModal(this.app, {
					imageSrc: blob, 
					resultText: (resultText === null) ? `Error in interacting with AI model: ${this.settings?.aiModel}` : resultText,
				});
				
				const result = await modal.openWithPromise();

				if (result) { // Simplified null check
					const filePath = result.includeImage ? await this.convertWrapper(blob) : null; // Combined conditional assignment
					await this.insertContent(editor, filePath, result.textContent);
				}
			});

		this.locked = true;
		await Promise.all(promises);
		this.locked = false;
    }

	/**
	 * Summarizes the currently selected text in the markdown editor using an AI model.
	 * 
	 * This method checks for the following preconditions:
	 * 1. The selected text is not empty.
	 * 2. No other image conversion is in progress.
	 * 3. The AI model is valid.
	 * 4. The AI model API key is not empty.
	 * 
	 * If all preconditions are met, the method will interact with the AI model, and
	 * insert the result text below the original selection.
	 * 
	 * @param editor - The markdown editor where the text will be inserted.
	 */
	async handleSummarize(editor: Editor) {
		const { aiModel, aiModel_APIKey } = await this.obtainAIModelInfo();
		const selectedText = editor.getSelection().trim();

		if (selectedText.length == 0) {
			new Notice("No text selected");
			return;
		} else if (this.locked) {
			new Notice(`Image Conversion in Progress: Please hold on for a moment`);
			return;
		} else if (aiModel === undefined) {
			new Notice(`AI Model not found`);
			return;
		} else if (aiModel_APIKey.length == 0) {
			new Notice(`AI Model API Key not found`);
			return;
		} else {
			const msg = `Interacting with ${aiModel.model_id}`;
			console.log(msg);
			new Notice(msg);
		}

		this.locked = true;
		let resultText = '';
		try {
			const modelInstance = createModelInstance(aiModel, aiModel_APIKey, this.app);
			modelInstance.init();
			resultText = await modelInstance.taskSummarize(selectedText);
		} catch (error) {
			resultText = `Error in calling AI Model: ${aiModel.model_id}.\n${error}`;
		}

		// Insert the returned text below the original selection
		await this.insertContent(editor, null, resultText, "to");
		this.locked = false;
	}

	/**
	 * Handles the conversion and embedding of images from the clipboard into the markdown editor.
	 * 
	 * This method reads image data from the clipboard, converts each image to the preferred format
	 * using the `convertWrapper` function, and embeds the resulting image file into the current
	 * markdown editor session. It displays notifications based on the conversion process.
	 * 
	 * If the image conversion is already in progress, or if the clipboard is empty, it notifies the user
	 * and exits early.
	 * 
	 * @param editor - The markdown editor where the image will be embedded.
	 * @param _view - The markdown view associated with the editor.
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
				await this.insertContent(editor, filePath);
			});

		this.locked = true;
		await Promise.all(promises);
		this.locked = false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleChangeCase(editor: Editor, _view: MarkdownView) {
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
}
