import { App, Modal, PluginSettingTab, Setting } from "obsidian";
import ImgWebpOptimizerPlugin from "./main";
import { ImgOptimizerPluginSettings, AIModel, AIModelSetting, AIModelSetting_Result } from "./interfaces";
import { tUtils } from "./utils";
import { createApp } from 'vue';
import { App as vueApp } from 'vue';
import APIKeysEditor from './components/APIKeysEditor.vue';
import { tSecureString } from "./secure";


export const DEFAULT_SETTINGS: Partial<ImgOptimizerPluginSettings> = {
	salt: '',
	imageFormat: 'webp',
	compressionLevel: 90,
	binExec: '',
	aiModel: '0',
	aiModelAPIKeys: {},
  };

export const ConfigValues = {
	validFormats: ["webp", "png", "avif", "jpeg"],
	aiModels: [
		{
			model_id: 'claude-3-5-sonnet-20241022',
			platform_id: 'Anthropic',
			interface: 'Mmllm_Anthropic',
		},
		{
			model_id: 'gemini-1.5-flash',
			platform_id: 'Google',
			interface: 'Mmllm_GoogleGenerativeAI',
		},
		{
			model_id: 'pixtral-12b-2409',
			platform_id: 'Mistral',
			interface: 'Mmllm_Mistral',
		},
		{
			model_id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
			platform_id: 'TogetherAI',
			interface: 'Mmllm_TogetherAI',
		},
		{
			model_id: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
			platform_id: 'TogetherAI',
			interface: 'Mmllm_TogetherAI',
		},
		{
			model_id: 'meta-llama/Llama-Vision-Free',
			platform_id: 'TogetherAI',
			interface: 'Mmllm_TogetherAI',
		},
		{
			model_id: 'gpt-4o-mini-2024-07-18',
			platform_id: 'OpenAI',
			interface: 'Mmllm_OpenAI',
		},
		{
			model_id: 'gpt-4o-2024-08-06',
			platform_id: 'OpenAI',
			interface: 'Mmllm_OpenAI',
		}
	] as AIModel[],
};

const validFormatsOptions: Record<string, string> = ConfigValues.validFormats.reduce((acc, item) => {
	acc[item] = item.toUpperCase();
	return acc;
  }, {} as Record<string, string>);

const validAIModelsOptions: Record<string, string> = ConfigValues.aiModels.reduce((acc, item: AIModel, _index) => {
	acc[`${item.platform_id}/${item.model_id}`] = `${item.model_id} (${item.platform_id})`;
return acc;
}, {} as Record<string, string>);

export class ImgOptimizerPluginSettingsTab extends PluginSettingTab {
	plugin: ImgWebpOptimizerPlugin;
	loadedSalt: boolean = false;
	/**
	 * Creates an instance of the ImgOptimizerPluginSettingsTab class.
	 * @param app - The Obsidian app instance.
	 * @param plugin - The ImgWebpOptimizerPlugin instance.
	 */
	constructor(app: App, plugin: ImgWebpOptimizerPlugin) {
	  super(app, plugin);
	  this.plugin = plugin;
	}

	saltChecker(): void {
		// salt
		if(this.plugin.settings?.salt.trim().length == 0) {
			this.plugin.settings.salt = tSecureString.generateRandomString();
			this.plugin.saveSettings().then(() => {
				this.loadedSalt = true;
			});
		} else {
			this.loadedSalt = true;
		}
	}

	/**
	 * @description
	 * This method is called when the user navigates to the plugin's settings tab.
	 * It should create the settings elements and populate the containerEl with them.
	 * 
	 * @method display
	 */
	display(): void {
		this.saltChecker();

	  let { containerEl } = this;
  
	  containerEl.empty();
  
		new Setting(containerEl)
		.setName('Image format')
		.setDesc('Accepts WEBP/AVIF/PNG/JPEG')
		.addDropdown((text) =>
			text
			.addOptions(validFormatsOptions)
			.setValue(this.plugin.settings?.imageFormat as string)
			.onChange(async (value: string) => {
				// @ts-ignore
				this.plugin.settings.imageFormat = ConfigValues.validFormats.includes(value.toLowerCase()) ? value.toLowerCase() : "webp";
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
		// @ts-ignore
		.setName(`Compression Level (current value: ${this.plugin.settings.compressionLevel})`)
		.setDesc('A Number between 0 and 100 indicating the image quality')
		.addSlider((cp) =>
			cp
			.setLimits(1, 100, 1)
			// @ts-ignore
			.setValue(this.plugin.settings.compressionLevel)
			.setDynamicTooltip()
			.onChange(async (value: number) => {
				// validation
				const compressionLevel = Math.min(100, Math.max(1, Math.floor(value))) || 90;
				// @ts-ignore
				this.plugin.settings.compressionLevel = compressionLevel;
				await this.plugin.saveSettings();
			})
			.showTooltip()
		);

		new Setting(containerEl)
		.setName('Absolute executable path to ImageMagick/FFMPEG/libvips command line (only for AVIF)')
		.setDesc('Example: /opt/homebrew/bin/magick')
		.addText((text) =>
			text
			.setPlaceholder('magick')
			// @ts-ignore
			.setValue(String(this.plugin.settings.binExec))
			.onChange(async (value) => {
				// validation
				// @ts-ignore
				this.plugin.settings.binExec = value.trim();
				await this.plugin.saveSettings();
			})
		);

		// AI Models
		new Setting(containerEl)
		.setName('AI Model')
		.setDesc('Select an AI model (image to md/latex)')
		.addDropdown((text) =>
			text
			.addOptions(validAIModelsOptions)
			// @ts-ignore
			.setValue(this.plugin.settings.aiModel)
			.onChange(async (value: string) => {
				// validation
				if(this.plugin.settings) {
					this.plugin.settings.aiModel = value;
					await this.plugin.saveSettings();
				}
			})
		);

		// Create a setting with a button
		new Setting(containerEl)
		.setName('AI Models - API Key Editor')
		.setDesc("Click the button to open API Key Editor.")
		.addButton((btn) => 
			btn
			.setButtonText("API Key Editor")
			.setCta()
			.onClick(async () => {
				if (this.plugin.settings && this.loadedSalt == true) {
					const ed = new APIKeysEditorModal(this.app, this.plugin.settings);
					const apiKeys: AIModelSetting_Result = await ed.openWithPromise();

					if(apiKeys.action == 'save') {
					try {
						for (const item of apiKeys.values) {
							const h = await tUtils.encodeRawApiKey(item.rawApiKey, item.settingKey, this.app, this.plugin.settings as ImgOptimizerPluginSettings);
							this.plugin.settings.aiModelAPIKeys[item.settingKey] = h;
						}
						await this.plugin.saveSettings();
					} catch (error) {
						console.log(error);
					}
					}
				} else {
					console.error('Plugin settings are not defined');
				}
			})
		);

	}
  }

// Custom Modal
class APIKeysEditorModal extends Modal {
	private vueApp: vueApp<Element> | null = null;
	private inputValue: AIModelSetting[] = [];
	private action: 'cancel' | 'save' = 'cancel';
	private settings: ImgOptimizerPluginSettings | undefined = undefined;
	constructor(app: App, settings: ImgOptimizerPluginSettings) {
	  super(app);
	  this.settings = settings;
	}

	async openWithPromise(): Promise<AIModelSetting_Result> {
		const p = new Promise<AIModelSetting_Result>((resolve) => {
			this.onClose = () => {
				resolve({
					action: this.action,
					values: this.inputValue,
				});
				this.vueApp?.unmount();
				this.contentEl.empty();
			};
		});

		if (this.settings) {
			this.inputValue = await tUtils.generateApiKeyFields(this.settings, this.app);
		} else {
			// handle the case where this.settings is undefined
			this.inputValue = [];
		}

		this.openModal();
		return p;
	}

	private openModal() {
		if (!this.vueApp) {
			this.vueApp = createApp(APIKeysEditor, {
				close: this.close.bind(this),
				updateSettings: (data: AIModelSetting[], action: 'save' | 'cancel') => {
					console.log(action);
					if(action == 'save') {
						this.inputValue = data;
						this.action = 'save';
					} else {
						this.inputValue = [];
						this.action = 'cancel';
					}
					
					this.close();
				},
				values: this.inputValue,
			});
			this.vueApp.mount(this.containerEl.children[1]);
		}

		this.open();
	}
  }