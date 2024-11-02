import { App, PluginSettingTab, Setting } from "obsidian";
import ImgWebpOptimizerPlugin from "./main";
import { ImgOptimizerPluginSettings, AIModel } from "./interfaces";

export const DEFAULT_SETTINGS: Partial<ImgOptimizerPluginSettings> = {
	imageFormat: 'webp',
	compressionLevel: 90,
	binExec: '',
	aiModel: '0',
	aiModelAPIKey: '',
  };

export const ConfigValues = {
	validFormats: ["webp", "png", "avif", "jpeg"],
	aiModels: [
		{
			model_id: 'claude-3-5-sonnet-20241022',
			platform_id: 'Anthropic',
		},
		{
			model_id: 'gemini-1.5-flash',
			platform_id: 'Google'
		},
		{
			model_id: 'pixtral-12b-2409',
			platform_id: 'Mistral'
		}
	] as AIModel[],
};

const validFormatsOptions: Record<string, string> = ConfigValues.validFormats.reduce((acc, item) => {
	acc[item] = item.toUpperCase();
	return acc;
  }, {} as Record<string, string>);

const validAIModelsOptions: Record<string, string> = ConfigValues.aiModels.reduce((acc, item: AIModel, index) => {
	const value = item.model_id;
	acc[value] = `${item.model_id} (${item.platform_id})`;
return acc;
}, {} as Record<string, string>);

export class ImgOptimizerPluginSettingsTab extends PluginSettingTab {
	plugin: ImgWebpOptimizerPlugin;
  
	/**
	 * Creates an instance of the ImgOptimizerPluginSettingsTab class.
	 * @param app - The Obsidian app instance.
	 * @param plugin - The ImgWebpOptimizerPlugin instance.
	 */
	constructor(app: App, plugin: ImgWebpOptimizerPlugin) {
	  super(app, plugin);
	  this.plugin = plugin;
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
		.setDesc('Default image format (accepts WEBP/AVIF/PNG/JPEG)')
		.addDropdown((text) =>
			text
			.addOptions(validFormatsOptions)
			.setValue(this.plugin.settings.imageFormat)
			.onChange(async (value: string) => {
				// validation
				this.plugin.settings.imageFormat = ConfigValues.validFormats.includes(value.toLowerCase()) ? value.toLowerCase() : "webp";
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
		.setName(`Compression Level (current value: ${this.plugin.settings.compressionLevel})`)
		.setDesc('A Number between 0 and 100 indicating the image quality')
		.addSlider((cp) =>
			cp
			.setLimits(1, 100, 1)
			.setValue(this.plugin.settings.compressionLevel)
			.setDynamicTooltip()
			.onChange(async (value: number) => {
				// validation
				const compressionLevel = Math.min(100, Math.max(1, Math.floor(value))) || 90;
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
			.setValue(String(this.plugin.settings.binExec))
			.onChange(async (value) => {
				// validation
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
			.setValue(this.plugin.settings.aiModel)
			.onChange(async (value: string) => {
				// validation
				this.plugin.settings.aiModel = value;
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
		.setName('AI Model API Key')
		.setDesc('Enter API Key here.')
		.addText((text) =>
			text
			.setValue(this.plugin.settings.aiModelAPIKey)
			.onChange(async (value) => {
				// validation
				this.plugin.settings.aiModelAPIKey = value.trim();
				await this.plugin.saveSettings();
			})
		);

	}
  }