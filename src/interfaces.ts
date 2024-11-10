import { z } from 'zod';

export interface ImgOptimizerPluginSettings {
	imageFormat: string; // webp | avif | png
	compressionLevel: number,
	binExec: string,
	aiModel: string,
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
	interface: string;
}

export const stringOrEmptySchema = z.union([
	z.string().transform((val) => val), // If it's a string, return it as is
	z.number().transform((val) => val.toString()), // If it's a number, convert to string
	z.unknown().transform(() => '') // If it's neither, return an empty string
  ]);

export const pathOrEmptyStringSchema = z.union([
	z.string().refine((val) => /^(\/[^\/]+)+$/.test(val), {
	  message: "Invalid path format"
	}).transform((val) => val), // Return the valid path as is
	z.unknown().transform(() => '') // Return empty string for non-string inputs
  ]);