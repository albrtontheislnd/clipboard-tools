import { App, Plugin, PluginSettingTab, Setting, Modal, ButtonComponent } from 'obsidian';

export class ImageTextModal extends Modal {
	private imageSrc: Blob;
	private textarea: HTMLTextAreaElement;
	private checkbox: HTMLInputElement;
    private resultText: string;
    private blobURL: string;

	constructor(app: App, imageSrc: Blob, resultText: string) {
		super(app);
		this.imageSrc = imageSrc;
        this.resultText = resultText;
	}

	/**
	 * Opens the modal and resolves the returned promise with the result.
	 * The result is an object with two properties:
	 * - `includeImage`: A boolean indicating whether the image should be included in the markdown file.
	 * - `textContent`: A string containing the text content of the textarea.
	 * If the modal is closed without submitting the form, the promise is resolved with `null`.
	 * @returns A promise that resolves with the result of the modal.
	 */
	openWithPromise(): Promise<{ includeImage: boolean, textContent: string } | null> {
		return new Promise((resolve) => {
			this.onOpenModal(resolve);
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
	 * @param resolve - A callback which is called when the user closes the modal.
	 */
	private onOpenModal(resolve: (result: { includeImage: boolean, textContent: string } | null) => void) {
		const { contentEl } = this;
        this.blobURL = URL.createObjectURL(this.imageSrc);

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
		this.textarea = contentEl.createEl('textarea', {
			cls: 'modal-textarea',
			attr: { rows: '4', placeholder: 'Loading content...' },
		});
        this.textarea.value = this.resultText;

		// 3. Checkbox for Including Image
		const checkboxContainer = contentEl.createDiv({ cls: 'modal-checkbox' });
		this.checkbox = checkboxContainer.createEl('input', { attr: { type: 'checkbox' } });
		checkboxContainer.createEl('label', { text: 'Include the image' });

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
					textContent: this.textarea.value
				}); // Resolves with data if user confirms
			});

        const style = document.createElement('style');
        style.textContent = `
            .modal-image {
                max-height: 500px;
                max-width: 700px;
                border-width: 2px;
                border-color: rgb(29 78 216);
            }

            .modal-textarea {
                width: 500px;
                height: 150px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                text-wrap: wrap;
            }
        `;
        document.head.appendChild(style);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}


