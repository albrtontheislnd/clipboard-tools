import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createApp, App as VueApp } from 'vue';
import DictionaryComponent from './dictUI.vue';
import ImgWebpOptimizerPlugin from '@/main';

export const VIEW_TYPE_DICTIONARY = 'alapaki-dictionary-view';

export class DictionaryView extends ItemView {
	private vueApp: VueApp | null = null;
	private plugin: ImgWebpOptimizerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ImgWebpOptimizerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_DICTIONARY;
	}

	getDisplayText(): string {
		return 'Dictionary';
	}

	getIcon(): string {
		return 'book-open';
	}

	async onOpen(): Promise<void> {
		// Clear any existing content
		const container = this.containerEl.children[1];
		container.empty();

		// Create a div for Vue to mount to
		const vueContainer = container.createDiv({ cls: 'dictionary-vue-container' });

		// Create and mount Vue app
		this.vueApp = createApp(DictionaryComponent, {
			apiServer: this.plugin.settings?.apiServer,
		});
		this.vueApp.mount(vueContainer);
	}

	async onClose(): Promise<void> {
		// Unmount Vue app
		if (this.vueApp) {
			this.vueApp.unmount();
			this.vueApp = null;
		}
	}
}
