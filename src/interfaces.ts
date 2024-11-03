
export interface ImgOptimizerPluginSettings {
	imageFormat: string; // webp | avif | png
	compressionLevel: number,
	binExec: string,
	aiModel: string,
	aiModelAPIKey: string,
	aiModelAPIKeys: StringKeyObject,
} 

export interface StringKeyObject {
	[key: string]: string;
}

export interface ImageFileObject {
	mimeType: string;
	fileExtension: string;
	buffer: ArrayBuffer | null;
	randomFilename: string;
	hasTFile ?: any;
}

export interface AIModel {
	model_id: string;
	platform_id: string;
}