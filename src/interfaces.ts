
export interface ImgOptimizerPluginSettings {
	imageFormat: string; // webp | avif | png
	compressionLevel: number,
	binExec: string,
} 

export interface ImageFileObject {
	mimeType: string;
	fileExtension: string;
	buffer: ArrayBuffer | null;
	randomFilename: string;
	hasTFile ?: any;
}