import { App, Modal } from 'obsidian';
import { createApp } from 'vue';
import { App as vueApp } from 'vue';
import AddLocalFile from '../components/AddLocalFile.vue';

export type callbackValue = { textContent: string } | null;
export type LocalFileInputArgs = {
	paths: string,
	keepExtension: boolean,
};

export class InsertLocalFileModal extends Modal {
	private vueApp: vueApp<Element> | null = null;
	private returnValue: callbackValue = null;
	private inputValue: LocalFileInputArgs;
	private closeHandler: (() => void) | null = null;

	constructor(app: App, args: LocalFileInputArgs) {
		super(app);
		this.inputValue = args;
		this.setTitle('Insert file paths');
	}

	/**
	 * Cleans up Vue app and event handlers to prevent memory leaks
	 * @private
	 */
	private cleanup(): void {
		if (this.vueApp) {
			this.vueApp.unmount();
			this.vueApp = null;
		}
		if (this.closeHandler) {
			this.closeHandler = null;
		}
		this.contentEl.empty();
	}

	/**
	 * Opens the modal and returns a promise that resolves to the value returned by the modal.
	 * The promise resolves to null if the modal is closed without a result.
	 * @returns A promise that resolves to the value returned by the modal.
	 */
	openWithPromise(): Promise<callbackValue> {
		return new Promise<callbackValue>((resolve) => {
			// Store the close handler reference
			this.closeHandler = () => {
				resolve(this.returnValue);
				this.cleanup();
			};

			// Override onClose with our handler
			const originalOnClose = this.onClose;
			this.onClose = () => {
				this.closeHandler?.();
				originalOnClose?.();
			};

			this.openModal();
		});
	}

	/**
	 * Mounts the Vue app to the container element and sets up the promise resolve callbacks.
	 * @private
	 */
	private openModal(): void {
		if (!this.vueApp) {
			try {
				this.vueApp = createApp(AddLocalFile, {
					close: this.close.bind(this),
					insertData: (data: callbackValue) => {
						this.returnValue = data;
						this.close();
					},
					values: this.inputValue,
				});
                const container = this.containerEl.children[1];
                if (!container) throw new Error('Container not found');
                this.vueApp.mount(container);
			} catch (error) {
				console.error('Failed to mount Vue app:', error);
				this.cleanup();
				this.close();
				return;
			}
		}

		this.open();
	}
}