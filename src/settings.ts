import { App, PluginSettingTab, Setting, TextComponent } from "obsidian";
import ImgWebpOptimizerPlugin from "./main";
import { ImgOptimizerPluginSettings, AIModel } from "./interfaces";
import { tUtils } from "./utils";

export const DEFAULT_SETTINGS: Partial<ImgOptimizerPluginSettings> = {
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
	apiKey_Field: TextComponent | null;
  
	/**
	 * Creates an instance of the ImgOptimizerPluginSettingsTab class.
	 * @param app - The Obsidian app instance.
	 * @param plugin - The ImgWebpOptimizerPlugin instance.
	 */
	constructor(app: App, plugin: ImgWebpOptimizerPlugin) {
	  super(app, plugin);
	  this.plugin = plugin;
	  this.apiKey_Field = null;
	}
  
	/**
	 * @description
	 * This method is called when the user navigates to the plugin's settings tab.
	 * It should create the settings elements and populate the containerEl with them.
	 * 
	 * @method display
	 */
	display(): void {
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
				if(this.apiKey_Field !== null) {
					// @ts-ignore
					this.plugin.settings.aiModel = value;
					// @ts-ignore
					this.apiKey_Field.setValue(await tUtils.getRawApiKey(this.plugin.settings.aiModel, this.app, this.plugin.settings));
					await this.plugin.saveSettings();
				}
			})
		);

		new Setting(containerEl)
		.setName('AI Model API Key Editor')
		.setDesc('Select a model to view/edit its associated API Key.')
		.addText((text) => {
				this.apiKey_Field = text;
				text
				.setPlaceholder('select a model...')
				.onChange(async (value) => {
					try {
						const h = await tUtils.encodeRawApiKey(value, this.app, this.plugin.settings as ImgOptimizerPluginSettings);
						// @ts-ignore
						this.plugin.settings.aiModelAPIKeys[this.plugin.settings.aiModel] = h;
						await this.plugin.saveSettings();
					} catch (error) {
						console.log(error);
					}
				});
				// end.
			}
		);

	}
  }