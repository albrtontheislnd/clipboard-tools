import { App, Modal } from 'obsidian';
import { createApp } from 'vue';
import { App as vueApp } from 'vue';
import  ImageToMarkdown  from './components/ImageToMarkdown.vue';

export type callbackValue = { includeImage: boolean, textContent: string } | null;
export type ImageTextModalInputArgs = {
	imageSrc: Blob,
	resultText: string,
};

export class ImageTextModal extends Modal {
	vueApp: vueApp<Element> | null = null;
	private returnValue: callbackValue  = null;
	inputValue: ImageTextModalInputArgs;
	
	/**
	 * Constructor for the ImageTextModal class.
	 * @param app - The Obsidian app instance.
	 * @param args - The input arguments containing the image source and the result text.
	 */
	constructor(app: App, args: ImageTextModalInputArgs) {
		super(app);
		this.inputValue = {
			'imageSrc': args.imageSrc,
			'resultText': args.resultText,
		};
	}

	/**
	 * Opens the modal and returns a promise that resolves to the value returned by the modal.
	 * The promise resolves to null if the modal is closed without a result.
	 * The modal is automatically closed when the promise resolves.
	 * @returns A promise that resolves to the value returned by the modal.
	 */
	async openWithPromise(): Promise<callbackValue> {
		return new Promise((resolve) => {
			this.onOpenModal();
			this.onClose = () => {
				this.vueApp?.unmount();
				this.contentEl.empty();
				resolve(this.returnValue);
			};
			this.open();
		});
	}


	/**
	 * Mounts the Vue app to the container element and sets up the promise resolve callbacks.
	 * @param _resolve - The promise resolve callback.
	 * @private
	 */
	private onOpenModal() {
		this.vueApp = createApp(ImageToMarkdown, {
			close: () => this.close(),
			insertData: (data: callbackValue) => {
				this.returnValue = data;
				this.close();
			},
			values: this.inputValue,
		});

		this.vueApp.mount(this.containerEl.children[1]);
	}
}


