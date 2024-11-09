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
	
	constructor(app: App, args: ImageTextModalInputArgs) {
		super(app);
		this.inputValue = {
			'imageSrc': args.imageSrc,
			'resultText': args.resultText,
		};
	}

	async openWithPromise(): Promise<callbackValue> {
		return new Promise((resolve) => {
			this.onOpenModal(resolve);
			this.onClose = () => {
				this.vueApp?.unmount();
				const { contentEl } = this;
				contentEl.empty();
				resolve(this.returnValue);
			};
			this.open();
		});
	}

	/**
	 * @description
	 * This private method is called right after the modal is opened.
	 * It sets up the content of the modal, and defines the behavior of the cancel and insert buttons.
	 * The method takes a callback which is called when the user closes the modal.
	 * The callback is called with `null` if the user cancels the modal,
	 * and with an object with two properties if the user confirms the modal:
	 * - `includeImage`: A boolean indicating whether the image should be included in the markdown file.
	 * - `textContent`: A string containing the text content of the textarea.
	 * @param _resolve - A callback which is called when the user closes the modal.
	 */
	private onOpenModal(_resolve: (result: callbackValue) => void) {
		//const { contentEl } = this;

		// @ts-ignore
		const handleDataFromChild = (data: callbackValue) => {
			this.returnValue = data;
			this.close();
		  };

		// Mount the Vue component, passing `close` as a prop
		this.vueApp = createApp(ImageToMarkdown, {
			close: () => this.close()
		});
		this.vueApp.mount(this.containerEl.children[1]);

/* 		this.root.render(
			<AppContext.Provider value={this.app}>
			  <ImageToMarkdown onData={handleDataFromChild} values={this.inputValue} />
			</AppContext.Provider>
		  ); */

/*         this.blobURL = URL.createObjectURL(this.imageSrc);

		// 1. HTML Image Element
		if (this.imageSrc) {
			const image = contentEl.createEl('img', {
				attr: { src: this.blobURL },
				cls: 'modal-image',
			});
            image.onload = () => {
                URL.revokeObjectURL(this.blobURL);
            };
		}

		// 2. Textarea Element
		this.textarea = contentEl.createEl('code', {
			cls: 'modal-textarea',
			attr: { contenteditable: 'true', spellcheck: 'false' },
		});
        this.textarea.innerText = this.resultText;

		// 3. Checkbox for Including Image
		const checkboxContainer = contentEl.createDiv({ cls: 'modal-checkbox' });
		this.checkbox = checkboxContainer.createEl('input', { attr: { type: 'checkbox', 'id': 'checkbox_confirm' } });
		checkboxContainer.createEl('label', { text: 'Include the image', attr: { 'for': 'checkbox_confirm' }  });

		// 4. Cancel Button
		const cancelButton = new ButtonComponent(contentEl);
		cancelButton.setButtonText('Cancel')
			.onClick(() => {
				this.close();
                resolve(null); // Resolves with null if user cancels
			});

		// 5. Insert Button
		const insertButton = new ButtonComponent(contentEl);
		insertButton.setButtonText('Insert')
			.onClick(() => {
                this.close();
                resolve({
					includeImage: this.checkbox.checked,
					textContent: this.textarea.innerText
				}); // Resolves with data if user confirms
			});

        const style = document.createElement('style');
        style.textContent = `

            .modal-image {
				max-width: 100%;
				max-height: 100%;
				width: auto;
				height: auto;
            }

            .modal-textarea {
				width: 100%;
				height: 200px;
				display: block;
				box-sizing: border-box;
				background-color: #f5f5f5;
				font-family: monospace;
				overflow: auto;
            }
        `;
        document.head.appendChild(style); */
	}
}


