import { App, PluginSettingTab, Setting } from "obsidian";
import ImgWebpOptimizerPlugin from "./main";
import { ImgOptimizerPluginSettings } from "./interfaces";

export const DEFAULT_SETTINGS: Partial<ImgOptimizerPluginSettings> = {
	imageFormat: 'avif',
	compressionLevel: 70,
	apiServer: 'http://localhost:5764',
	useS3Storage: true,
  };

export const ConfigValues = {
	validFormats: ["webp", "png", "avif", "jpeg"],
};

const validFormatsOptions: Record<string, string> = Object.fromEntries(ConfigValues.validFormats.map(item => [item, item]));

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

	/**
	 * @description
	 * This method is called when the user navigates to the plugin's settings tab.
	 * It should create the settings elements and populate the containerEl with them.
	 * 
	 * @method display
	 */
	display(): void {
	  const { containerEl } = this;
  
	  containerEl.empty();
  
		new Setting(containerEl)
		.setName('Image format')
		.setDesc('Accepts WEBP/AVIF/PNG/JPEG')
		.addDropdown((text) =>
			text
			.addOptions(validFormatsOptions)
			.setValue(this.plugin.settings?.imageFormat as string)
			.onChange(async (value: string) => {
				// @ts-expect-error Suppress
				this.plugin.settings.imageFormat = ConfigValues.validFormats.includes(value.toLowerCase()) ? value.toLowerCase() : "webp";
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
		// @ts-expect-error Suppress
		.setName(`Compression Level (current value: ${this.plugin.settings.compressionLevel})`)
		.setDesc('A Number between 0 and 100 indicating the image quality')
		.addSlider((cp) =>
			cp
			.setLimits(1, 100, 1)
			// @ts-expect-error Suppress
			.setValue(this.plugin.settings.compressionLevel)
			.setDynamicTooltip()
			.onChange(async (value: number) => {
				// validation
				const compressionLevel = Math.min(100, Math.max(1, Math.floor(value))) || 90;
				// @ts-expect-error Suppress
				this.plugin.settings.compressionLevel = compressionLevel;
				await this.plugin.saveSettings();
			})
			.showTooltip()
		);

		// Local API server URL
		new Setting(containerEl)
		.setName('Local API Server')
		.setDesc('Example: http://localhost:3000')
		.addText((text) =>
			text
			.setPlaceholder('http://localhost:3000')
			.setValue(String(this.plugin.settings?.apiServer))
			.onChange(async (value) => {
				// validation
				this.plugin.settings!.apiServer = value.trim();
				await this.plugin.saveSettings();
			})
		);

		// Use S3 Storage setting
		new Setting(containerEl)
		.setName('Use S3 Storage')
		.setDesc('Enable the use of S3 storage for uploads')
		.addToggle((toggle) =>
			toggle
			.setValue(this.plugin.settings?.useS3Storage ?? false)
			.onChange(async (value) => {
				this.plugin.settings!.useS3Storage = value;
				await this.plugin.saveSettings();
			})
		);


	}
  }




