import { App, Editor, FileSystemAdapter, MarkdownView, Menu, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { tUtils } from './utils';
import { DEFAULT_SETTINGS, ImgOptimizerPluginSettingsTab } from './settings';

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
			name: 'Embed clipboard image as WEBP/AVIF/PNG format',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if(this.locked) {
					new Notice(`Image Conversion in Progress: Please hold on for a moment.`);
				} else {
					this.handleClipboardImage(editor, view).then(() => {});
				}
			}
		});

		this.addRibbonIcon('image-plus', 'Embed clipboard image as WEBP/AVIF/PNG format', () => {
			try {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const editor = view?.editor;
				if(view && editor) {
					if(this.locked) {
						new Notice(`Image Conversion in Progress: Please hold on for a moment.`);
					} else {
						this.handleClipboardImage(editor, view).then(() => {});
					}				
				}
			} catch (error) {
				return;	
			}
		  });


	}

	onunload() {

	}

	/**
	 * Generate a random filename that includes the current date and time in ISO format and a 5 character random string.
	 * @param {string} [fileExtension] - The file extension of the filename. If not provided, an empty string is used.
	 * @returns {string} A filename with the format: `PastedImage_{ISODateTime}_{randomString}[.{fileExtension}]`
	 */
	randomFilename(fileExtension: string = ''): string {
		// PastedImage_{randomString}_{ISODateTime}
		const randomString = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(-5);
		const ISODateTime = new Date().toISOString().replace(/[:.-]/g, '');
		
		// fileExtension?
		fileExtension = (fileExtension.length > 0) ? `.${fileExtension.toLowerCase()}` : '';

		// return filename
		return `PastedImage_${ISODateTime}_${randomString}${fileExtension}`;
	}

	async ProcessWEBP(blob: Blob): Promise<ImageFileObject | null> {
		const quality = this.settings.compressionLevel / 100;

		const file: ImageFileObject = {
			mimeType: 'image/webp',
			fileExtension: 'webp',
			buffer: null,
			randomFilename: '',
		};

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
			console.error(`ProcessWEBP() error: ${error}`);
		}

		// generate random filename
		file.randomFilename = this.randomFilename(file.fileExtension);
		return file;
	}

	async ProcessPNG(blob: Blob): Promise<ImageFileObject | null> {
		const file: ImageFileObject = {
			mimeType: 'image/png',
			fileExtension: 'png',
			buffer: null,
			randomFilename: '',
		};

		file.buffer = await blob.arrayBuffer();

		// generate random filename
		file.randomFilename = this.randomFilename(file.fileExtension);
		return file;
	}

	async ProcessAVIF(blob: Blob): Promise<ImageFileObject | null> {
		const file: ImageFileObject = {
			mimeType: 'image/avif',
			fileExtension: 'avif',
			buffer: null,
			randomFilename: '',
		};

		const adapter = <FileSystemAdapter> this.app.vault.adapter;
		const tempFilename = this.randomFilename();

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
	 * Converts a given blob to a specific image format.
	 * @param {Blob} blob - The blob to convert.
	 * @returns {Promise<ImageFileObject | null>} - A promise that resolves to an object with the converted buffer, mime-type, file extension, and a random filename.
	 */
    async convertTo(blob: Blob): Promise<ImageFileObject | null> {

		if(this.settings.imageFormat === 'webp') {
			const file = await this.ProcessWEBP(blob);
			return file;
		}

		if(this.settings.imageFormat === 'png') {
			const file = await this.ProcessPNG(blob);
			return file;
		}

		if(this.settings.imageFormat === 'avif') {
			const file = await this.ProcessAVIF(blob);
			return file;
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
        if (!clipboardItems) return;

		this.locked = true;

        for (const item of clipboardItems) {
			if (!item.types.includes("image/png")) {
				continue;
			}

			const blob = await item.getType("image/png");
			const fileObject = await this.convertTo(blob);

			if (fileObject !== null) {
				let file: TFile;

				if(fileObject?.hasTFile instanceof TFile) {
					file = <TFile> fileObject.hasTFile;
				} else {
					const filePath = await this.app.fileManager.getAvailablePathForAttachment(fileObject.randomFilename);
					file = await this.app.vault.createBinary(filePath, <ArrayBuffer> fileObject.buffer);
				}

				// Embed the image in the current markdown file
				const embedMarkdown = `![[${file.path}]]`;
				editor.replaceSelection(embedMarkdown);
				
				new Notice(`Image saved as ${file.name}`);
			}
        }

		this.locked = false;
    }	

}