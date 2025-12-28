import { Modal, App } from 'obsidian';

export class LoadingModal extends Modal {
    public status: string = 'Loading...';
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.createEl('div', {
            text: this.status,
            cls: 'loading-message'
        });
        contentEl.createEl('div', {
            cls: 'loading-spinner'
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}