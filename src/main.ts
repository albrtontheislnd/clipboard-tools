import { Editor, FileSystemAdapter, MarkdownFileInfo, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { tUtils } from './utils';
import { ConfigValues, DEFAULT_SETTINGS, ImgOptimizerPluginSettingsTab } from './settings';
import { AIModel, ImageFileObject, ImgOptimizerPluginSettings } from './interfaces';
import { ImageTextModal } from './aiprompt_modal';
import { createModelInstance } from './aiprompt';

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
		await this.loadSettings();
		this.addSettingTab(new ImgOptimizerPluginSettingsTab(this.app, this));


		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'paste-optimized-img',
			name: 'Embed clipboard image in WEBP/AVIF/PNG/JPEG format',
			editorCallback: async (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
				if (view instanceof MarkdownView) {
				  await this.handleClipboardImage(editor, view);
				} else {
				  // Handle the case where ctx is a MarkdownFileInfo
				}
			  }
		});

		this.addCommand({
			id: 'ai-convert-md',
			name: 'Convert clipboard image to Markdown/Latex',
			editorCallback: async (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
				if (view instanceof MarkdownView) {
					await this.handleMultiModalAI(editor, view);
				  } else {
					// Handle the case where ctx is a MarkdownFileInfo
				  }	
			}
		});

		this.addCommand({
			id: 'ai-summarize-text',
			name: 'Summarize text',
			editorCallback: async (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
				if (view instanceof MarkdownView) {
					await this.summarizeSelectedText(editor);
				  } else {
					// Handle the case where ctx is a MarkdownFileInfo
				  }	
				
			}
		});

		// editor-menu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				if (view instanceof MarkdownView) {
					menu.addItem((item) => {
						item.setTitle(`Clipboard: Embed optimized ${this.settings?.imageFormat.toUpperCase()}`).setIcon('image-plus')
							.onClick(async () => await this.handleClipboardImage(editor, view));
					});

					menu.addItem((item) => {
						item.setTitle(`Clipboard: Convert to Markdown`).setIcon('brain-circuit')
							.onClick(async () => await this.handleMultiModalAI(editor, view));
					});

					menu.addItem((item) => {
						item.setTitle(`Clipboard: Summarize text`).setIcon('clipboard-pen-line')
							.onClick(async () => await this.summarizeSelectedText(editor));
					});
				}
			})
		);
	}

	onunload() {
	}

	/**
	 * Process a given blob by converting it to the specified format (WEBP, JPEG, or PNG)
	 * @param {Blob} blob - The blob to process
	 * @param {string} format - The target format ('webp', 'jpeg', or 'png')
	 * @returns {Promise<ImageFileObject | null>} - A promise that resolves to an ImageFileObject containing
	 * the converted image buffer, mime-type, file extension, and a randomly generated filename
	 */
	async ProcessImage(blob: Blob, format: 'webp' | 'jpeg' | 'png'): Promise<ImageFileObject | null> {
		const file: ImageFileObject = {
			mimeType: `image/${format}`,
			fileExtension: format,
			buffer: null,
			randomFilename: '',
		};

		if (format === 'png') {
			file.buffer = await blob.arrayBuffer();
		} else {
			const quality = this.settings ? this.settings.compressionLevel / 100 : 0.9;

			try {
				// Create an OffscreenCanvas
				const imgBitmap = await createImageBitmap(blob);
				const offscreenCanvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
				const ctx = offscreenCanvas.getContext("2d");
				ctx?.drawImage(imgBitmap, 0, 0);
				
				const imgBlob = await new Promise<Blob>((resolve) => {
					offscreenCanvas.convertToBlob({ type: file.mimeType, quality: quality }).then(resolve);
				});

				file.buffer = await imgBlob.arrayBuffer();
			} catch (error) {
				// encoding error!
				// return as PNG
				file.mimeType = 'image/png';
				file.fileExtension = 'png';
				file.buffer = await blob.arrayBuffer();
				console.error(`ProcessImage() error: ${error}`);
			}
		}

		// generate random filename
		file.randomFilename = tUtils.randomFilename(file.fileExtension);
		return file;
	}

	/**
	 * Process a given blob by converting it to an AVIF buffer using the `convertImage` helper function.
	 * @param {Blob} blob - The blob to process.
	 * @returns {Promise<ImageFileObject | null>} - A promise that resolves to an ImageFileObject containing
	 * the converted image buffer, mime-type, file extension, and a randomly generated filename.
	 * If the conversion fails, the original image buffer is returned, encoded as PNG.
	 */
	async ProcessAVIF(blob: Blob): Promise<ImageFileObject | null> {
		const file: ImageFileObject = {
			mimeType: 'image/avif',
			fileExtension: 'avif',
			buffer: null,
			randomFilename: '',
		};

		const adapter = <FileSystemAdapter> this.app.vault.adapter;
		const tempFilename = tUtils.randomFilename();

		// 1, we save a PNG file
		const tempPNG_normalizedPath = await this.app.fileManager.getAvailablePathForAttachment(`${tempFilename}.png`);
		const tempPNG_absolutePath = adapter.getFullPath(tempPNG_normalizedPath);
		const tempPNGFile = await this.app.vault.createBinary(tempPNG_normalizedPath, <ArrayBuffer> (await blob.arrayBuffer()));
		
		// 2, get output filename for AVIF
		const tempAVIF_normalizedPath = await this.app.fileManager.getAvailablePathForAttachment(`${tempFilename}.avif`);
		const tempAVIF_absolutePath = adapter.getFullPath(tempAVIF_normalizedPath);

		// 3, convert using commandline tools
		const execResult = await tUtils.convertImage(
			this.settings?.binExec as string,
			tempPNG_absolutePath, 
			tempAVIF_absolutePath, 
			this.settings?.compressionLevel as number);

		console.log(execResult.stderr, execResult.stdout, execResult.result);

		// 4, check
		const _file = this.app.vault.getFileByPath(tempAVIF_normalizedPath);

		if(_file instanceof TFile) { // success!
			this.app.fileManager.trashFile(tempPNGFile); // we don't need it anymore
			file.buffer = null;
			file.randomFilename = `${tempFilename}.avif`;
			file.hasTFile = _file;
		} else { // failed, PNG fallback
			file.mimeType = 'image/png';
			file.fileExtension = 'png';
			file.buffer = null;
			file.randomFilename = `${tempFilename}.png`;
			file.hasTFile = tempPNGFile;
		}

		return file;
	}

	/**
	 * A wrapper function for converting a blob to a file that can be embedded
	 * in a markdown file. The returned string is the path of the created file.
	 * @param {Blob} blob - The blob to convert.
	 * @returns {Promise<string | null>} - A promise that resolves to the path of the created file, or null.
	 */
	async convertWrapper(blob: Blob): Promise<string | null> {

		/**
		 * Converts a given blob to a specific image format and returns an object with the converted buffer, mime-type, file extension, and a random filename.
		 * @param {Blob} blob - The blob to convert.
		 * @param {string} imageFormat - The desired image format. One of 'webp', 'png', 'avif', or 'jpeg'.
		 * @returns {Promise<ImageFileObject | null>} - A promise that resolves to an object with the converted buffer, mime-type, file extension, and a random filename, or null if the conversion fails.
		 */
		const convertTo = async (): Promise<ImageFileObject | null> => {
			switch (this.settings?.imageFormat) {
				case 'webp': return this.ProcessImage(blob, 'webp');
				case 'png': return this.ProcessImage(blob, 'png');
				case 'avif': return this.ProcessAVIF(blob);
				case 'jpeg': return this.ProcessImage(blob, 'jpeg');
				default: return null;
			}
		};

		const fileObject = await convertTo();
		if (fileObject !== null) {
			let file: TFile;

			if(fileObject?.hasTFile instanceof TFile) {
				file = <TFile> fileObject.hasTFile;
			} else {
				const filePath = await this.app.fileManager.getAvailablePathForAttachment(fileObject.randomFilename);
				file = await this.app.vault.createBinary(filePath, <ArrayBuffer> fileObject.buffer);
			}

			// Embed the image in the current markdown file
			return file.path;
		}

		return null;
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
    async handleClipboardImage(editor: Editor, _view: MarkdownView) {
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
				const filePath = await this.convertWrapper(blob);

				if(filePath !== null) {
					// Embed the image in the current markdown file
					const embedMarkdown = `![[${filePath}]]`;
					editor.replaceSelection(embedMarkdown);
					
					new Notice(`Image saved as ${filePath}`);
				}
			});

		this.locked = true;
		await Promise.all(promises);
		this.locked = false;
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

		if(aiModel === undefined) {
			new Notice(`AI Model not found`);
			return null;
		} else if (aiModel_APIKey.length === 0) {
			new Notice(`AI Model API Key not found`);
			return null;
		} else {
			const msg = `Interacting with ${aiModel.model_id}`;
			console.log(msg);
			new Notice(msg);
		}

		let resultText = '';
		// logic
		try {
			const modelInstance = createModelInstance(aiModel, aiModel_APIKey, this.app);
			modelInstance.init();
			await modelInstance.addImage(blob);
			resultText = await modelInstance.taskOCR();
		} catch (error) {
			console.log(error);
			resultText = `Error in calling AI Model: ${aiModel.model_id}.\n${error}`;
		}

		return resultText;
		// end: logic		
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
    async handleMultiModalAI(editor: Editor, _view: MarkdownView) {
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

				let resultText = await this.convertImageToMarkdown(blob);
				if(resultText === null) resultText = `Error in interacting with AI model: ${this.settings?.aiModel}`;

				const modal = new ImageTextModal(this.app, {
					imageSrc: blob, resultText: resultText
				});
				
				const result = await modal.openWithPromise();

				if(result !== null) {
					if(result.includeImage === true) {
						const filePath = await this.convertWrapper(blob);

						if(filePath !== null) {
							const embedMarkdown = `![[${filePath}]]`; // Embed the image in the current markdown file
							editor.replaceSelection(`\n${embedMarkdown}\n`);
							new Notice(`Image saved as ${filePath}`);
						}
					}
					editor.replaceSelection(`\n${result.textContent}\n`);
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
	async summarizeSelectedText(editor: Editor) {
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
		// logic
		try {
			const modelInstance = createModelInstance(aiModel, aiModel_APIKey, this.app);
			modelInstance.init();
			resultText = await modelInstance.taskSummarize(selectedText);
		} catch (error) {
			console.log(error);
			resultText = `Error in calling AI Model: ${aiModel.model_id}.\n${error}`;
		}
		// end: logic

		// Insert the returned text below the original selection
		editor.replaceRange(`\n${resultText}`, editor.getCursor('to')); // Get the end position of the selection
		this.locked = false;
	}
}