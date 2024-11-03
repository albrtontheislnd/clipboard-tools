import { App, Editor, FileSystemAdapter, MarkdownView, Menu, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { tUtils } from './utils';
import { ConfigValues, DEFAULT_SETTINGS, ImgOptimizerPluginSettingsTab } from './settings';
import { ImageFileObject, ImgOptimizerPluginSettings } from './interfaces';
import { AIPrompts } from './aiprompt';
import { ImageTextModal } from './aiprompt_modal';


export default class ImgWebpOptimizerPlugin extends Plugin {
	settings: ImgOptimizerPluginSettings;
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
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.handleClipboardImage(editor, view);
			}
		});

		this.addCommand({
			id: 'ai-convert-md',
			name: 'Convert clipboard image to Markdown/Latex',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.handleMultiModalAI(editor, view);
			}
		});

		this.addCommand({
			id: 'ai-summarize-text',
			name: 'Summarize text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.summarizeSelectedText(editor);
			}
		});

		// editor-menu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				if (view instanceof MarkdownView) {
					menu.addItem((item) => {
						item.setTitle(`Clipboard: Embed optimized ${this.settings.imageFormat.toUpperCase()}`).setIcon('image-plus')
							.onClick(async () => this.handleClipboardImage(editor, view));
					});

					menu.addItem((item) => {
						item.setTitle(`Clipboard: Convert to Markdown`).setIcon('brain-circuit')
							.onClick(async () => this.handleMultiModalAI(editor, view));
					});

					menu.addItem((item) => {
						item.setTitle(`Clipboard: Summarize text`).setIcon('clipboard-pen-line')
							.onClick(async () => this.summarizeSelectedText(editor));
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
			const quality = this.settings.compressionLevel / 100;
			
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
			this.settings.binExec,
			tempPNG_absolutePath, 
			tempAVIF_absolutePath, 
			this.settings.compressionLevel);

		console.log(execResult.stderr, execResult.stdout, execResult.result);

		// 4, check
		const _file = this.app.vault.getFileByPath(tempAVIF_normalizedPath);

		if(_file instanceof TFile) { // success!
			this.app.vault.delete(tempPNGFile); // we don't need it anymore
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
			switch (this.settings.imageFormat) {
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
     * Handle pasting an image from the clipboard.
     * @param editor - The editor for the current markdown file.
     * @param view - The markdown view for the current markdown file.
     */
    async handleClipboardImage(editor: Editor, view: MarkdownView) {
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
	 * Calls the selected AI model to convert a given image blob to a markdown string.
	 * @param blob - The image blob to convert.
	 * @returns A promise that resolves to a markdown string or null if the conversion fails.
	 */
    async convertImageToMarkdown(blob: Blob): Promise<string | null> {
		const aiModel = ConfigValues.aiModels.find(item => item.model_id === this.settings.aiModel);
		const aiModel_APIKey = await tUtils.getRawApiKey((aiModel === undefined) ? '' : aiModel.model_id, this.app, this.settings);

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

		try {
			switch (aiModel.platform_id.toLowerCase()) {
				case 'anthropic':
					resultText = await AIPrompts.convertImageToMarkdown_Anthropic(this.app, blob, aiModel.model_id, aiModel_APIKey);
					break;

				case 'google':
					resultText = await AIPrompts.convertImageToMarkdown_Google(this.app, blob, aiModel.model_id, aiModel_APIKey);
					break;

				case 'mistral':
					resultText = await AIPrompts.convertImageToMarkdown_Mistral(this.app, blob, aiModel.model_id, aiModel_APIKey);
					break;
			
				default:
					resultText = '';
					break;
			}
		} catch (error) {
			resultText = `Error in calling AI Model: ${aiModel.model_id}.\n${error}`;
		}

		return resultText;
    }

	/**
	 * Handles the conversion of clipboard images to Markdown and LaTeX using AI models.
	 * 
	 * This method checks if an image is in the clipboard, interacts with a selected AI model 
	 * to convert the image to a Markdown string, and presents the result in a modal. The user 
	 * can choose to include the image in the current Markdown file, or only the converted text.
	 * 
	 * @param editor - The editor for the current markdown file.
	 * @param view - The markdown view for the current markdown file.
	 */
    async handleMultiModalAI(editor: Editor, view: MarkdownView) {
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
				if(resultText === null) resultText = `Error in interacting with AI model: ${this.settings.aiModel}`;

				const modal = new ImageTextModal(this.app, blob, resultText);
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
	 * Summarizes the currently selected text in the markdown editor using the chosen AI model.
	 * 
	 * This method gets the selected text, interacts with the selected AI model to summarize the text,
	 * and inserts the summarized text below the original selection.
	 * 
	 * @param editor - The markdown editor.
	 */
	async summarizeSelectedText(editor: Editor) {
		const aiModel = ConfigValues.aiModels.find(item => item.model_id === this.settings.aiModel);
		const aiModel_APIKey = await tUtils.getRawApiKey((aiModel === undefined) ? '' : aiModel.model_id, this.app, this.settings);
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
			const msg = `Interacting with ${this.settings.aiModel}`;
			console.log(msg);
			new Notice(msg);
		}

		this.locked = true;
		// Paste the selection to an async function and await the result
		let resultText = '';

		try {
			switch (aiModel.platform_id.toLowerCase()) {
				case 'anthropic':
					resultText = await AIPrompts.summarizeText_Anthropic(selectedText, aiModel.model_id, aiModel_APIKey);
					break;

				case 'google':
					resultText = await AIPrompts.summarizeText_Google(selectedText, aiModel.model_id, aiModel_APIKey);
					break;

				case 'mistral':
					resultText = await AIPrompts.summarizeText_Mistral(selectedText, aiModel.model_id, aiModel_APIKey);
					break;
			
				default:
					resultText = '';
					break;
			}
		} catch (error) {
			resultText = `Error in calling AI Model: ${aiModel.model_id}.\n${error}`;
		}
	
		// Insert the returned text below the original selection
		editor.replaceRange(`\n${resultText}`, editor.getCursor('to')); // Get the end position of the selection
		this.locked = false;
	}
}