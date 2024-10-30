
interface ImgOptimizerPluginSettings {
	imageFormat: string; // webp | avif | png
	compressionLevel: number,
	binExec: string,
} 

interface ImageFileObject {
	mimeType: string;
	fileExtension: string;
	buffer: ArrayBuffer | null;
	randomFilename: string;
	hasTFile ?: any;
}