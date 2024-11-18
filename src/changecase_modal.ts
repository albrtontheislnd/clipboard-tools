import { App, Modal } from 'obsidian';
import { createApp } from 'vue';
import { App as vueApp } from 'vue';
import  ChangeCase  from './components/ChangeCase.vue';

export type callbackValue = { textContent: string } | null;
export type ChangeCaseInputArgs = {
	selectedText: string,
};

export class ChangeCaseModal extends Modal {
	private vueApp: vueApp<Element> | null = null;
	private returnValue: callbackValue  = null;
	private inputValue: ChangeCaseInputArgs;
	
	constructor(app: App, args: ChangeCaseInputArgs) {
		super(app);
		this.inputValue = args;
	}

	/**
	 * Opens the modal and returns a promise that resolves to the value returned by the modal.
	 * The promise resolves to null if the modal is closed without a result.
	 * The modal is automatically closed when the promise resolves.
	 * @returns A promise that resolves to the value returned by the modal.
	 */
	openWithPromise(): Promise<callbackValue> {
		const p = new Promise<callbackValue>((resolve) => {
			this.onClose = () => {
				resolve(this.returnValue);
				this.vueApp?.unmount();
				this.contentEl.empty();
			};
		});
		this.openModal();
		return p;
	}


	/**
	 * Mounts the Vue app to the container element and sets up the promise resolve callbacks.
	 * @private
	 */
	private openModal() {
		if (!this.vueApp) {
			this.vueApp = createApp(ChangeCase, {
				close: this.close.bind(this),
				insertData: (data: callbackValue) => {
					this.returnValue = data;
					this.close();
				},
				values: this.inputValue,
			});
			this.vueApp.mount(this.containerEl.children[1]);
		}

		this.open();
	}
}


