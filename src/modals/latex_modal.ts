import { App, Modal } from 'obsidian';
import { createApp } from 'vue';
import { App as vueApp } from 'vue';
import  LatexInput  from '../components/LatexInput.vue';
import katexCss from 'katex/dist/katex.min.css?inline';

export type callbackValue = { textContent: string } | null;
export type LatexInputArgs = {
	selectedText: string,
};

const KATEX_STYLE_ID = 'katex-inline-style';

export function ensureKatexCssLoaded() {
  if (document.getElementById(KATEX_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = KATEX_STYLE_ID;
  style.textContent = katexCss;

  document.head.appendChild(style);
}

export class LatexInputModal extends Modal {
	private vueApp: vueApp<Element> | null = null;
	private returnValue: callbackValue  = null;
	private inputValue: LatexInputArgs;
	
	constructor(app: App, args: LatexInputArgs) {
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
				this.vueApp = null;
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
			
			ensureKatexCssLoaded();

			this.vueApp = createApp(LatexInput, {
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
