import { App, Modal } from 'obsidian';
import { createApp } from 'vue';
import { App as vueApp } from 'vue';
import LatexModal from '../components/LatexModal.vue';

export type callbackValue = { textContent: string } | null;
export type LatexModalInputArgs = {
    selectedText: string,
};

export class InsertLatexModal extends Modal {
    private vueApp: vueApp<Element> | null = null;
    private returnValue: callbackValue = null;
    private inputValue: LatexModalInputArgs;
    private closeHandler: (() => void) | null = null;
    private static lastOpenTime = 0;
    private static readonly DEBOUNCE_MS = 100;
    
    constructor(app: App, args: LatexModalInputArgs) {
        super(app);
        this.inputValue = args;
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
     * The modal is automatically closed when the promise resolves.
     * @returns A promise that resolves to the value returned by the modal.
     */
    openWithPromise(): Promise<callbackValue> {
        // Debounce rapid successive opens
        const now = Date.now();
        if (now - InsertLatexModal.lastOpenTime < InsertLatexModal.DEBOUNCE_MS) {
            return Promise.resolve(null);
        }
        InsertLatexModal.lastOpenTime = now;

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
                this.vueApp = createApp(LatexModal, {
                    close: this.close.bind(this),
                    insertData: (data: callbackValue) => {
                        this.returnValue = data;
                        this.close();
                    },
                    values: this.inputValue,
                });
                this.vueApp.mount(this.containerEl.children[1]);
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
