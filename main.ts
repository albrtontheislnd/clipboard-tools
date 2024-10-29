import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


export default class ImgWebpOptimizerPlugin extends Plugin {
	// settings: MyPluginSettings;

	async onload() {
/* 		// await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		}); */

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'paste-optimized-img',
			name: 'Embed clipboard image as WEBP format',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.handleClipboardImage(editor, view).then(() => {
					// when finished!
					// console.log(`handleClipboardImage() completed.`);
				});
			}
		});


	}

	onunload() {

	}

/**
 * Converts a given image Blob to a WebP format Blob.
 * 
 * @param blob - The original image Blob to be converted.
 * @returns A Promise that resolves to the converted WebP Blob or null if the conversion fails.
 */
    async convertToWebP(blob: Blob): Promise<Blob | null> {
        return new Promise((resolve) => {
            const img = new Image();
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

			const objectURL = URL.createObjectURL(blob);

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);

				URL.revokeObjectURL(objectURL);

                // Use WebP quality from settings
                canvas.toBlob(
                    (webpBlob) => resolve(webpBlob),
                    "image/webp",
                    0.9
                );
            };

            img.onerror = () => {
				URL.revokeObjectURL(objectURL);
				resolve(null);
			};
            img.src = objectURL;
        });
    }

    /**
     * Handle a paste event by saving the image from the clipboard as a WEBP image
     * and embedding it in the current markdown file.
     * @param editor The current editor instance
     * @param view The current markdown view instance
     */
    async handleClipboardImage(editor: Editor, view: MarkdownView) {
		// console.log(`handleClipboardImage() began.`);

        const clipboardItems = await navigator.clipboard.read();
        if (!clipboardItems) return;

        for (const item of clipboardItems) {
			if (!item.types.includes("image/png")) {
				continue;
			}

			const blob = await item.getType("image/png");
			const webpBlob = await this.convertToWebP(blob);

			if (webpBlob) {
				const fileName = `Pasted_Image_${Date.now()}.webp`;
				const filePath = await this.app.fileManager.getAvailablePathForAttachment(fileName);
				// console.log(filePath);

				const arrayBuffer = await webpBlob.arrayBuffer();
				const file = await this.app.vault.createBinary(filePath, arrayBuffer);
				

				// Embed the image in the current markdown file
				const embedMarkdown = `![[${file.path}]]`;
				editor.replaceSelection(embedMarkdown);

				new Notice(`Image saved as ${fileName}`);
			}
        }
    }	

}
