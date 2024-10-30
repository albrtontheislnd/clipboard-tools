import { App, PluginSettingTab, Setting } from "obsidian";
import ImgWebpOptimizerPlugin from "./main";
import { ImgOptimizerPluginSettings } from "./interfaces";

export const DEFAULT_SETTINGS: Partial<ImgOptimizerPluginSettings> = {
	imageFormat: 'webp',
	compressionLevel: 90,
	binExec: '',
  };

export const ConfigValues = {
	validFormats: ["webp", "png", "avif"],
}

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
		.setDesc('Default image format (accepts WEBP, AVIF, and PNG)')
		.addText((text) =>
			text
			.setPlaceholder('WEBP')
			.setValue(this.plugin.settings.imageFormat)
			.onChange(async (value) => {
				// validation
				this.plugin.settings.imageFormat = ConfigValues.validFormats.includes(value.toLowerCase()) ? value.toLowerCase() : "webp";
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
		.setName('Compression Level')
		.setDesc('A Number between 0 and 100 indicating the image quality')
		.addText((text) =>
			text
			.setPlaceholder('90')
			.setValue(String(this.plugin.settings.compressionLevel))
			.onChange(async (value) => {
				// validation
				const compressionLevel = Math.min(100, Math.max(1, parseInt(value, 10))) || 90;
				this.plugin.settings.compressionLevel = Number(compressionLevel);
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
		.setName('Absolute executable path to ImageMagick/FFMPEG (only for AVIF)')
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

	}
  }