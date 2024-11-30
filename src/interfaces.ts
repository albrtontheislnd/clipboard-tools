import { z } from 'zod';

export interface ImgOptimizerPluginSettings {
	salt: string,
	imageFormat: string; // webp | avif | png
	compressionLevel: number,
	binExec: string,
	aiModel: string,
	aiModelAPIKeys: StringKeyObject,
	s3Settings: ImgS3PluginSettings,
} 

export interface ImgS3PluginSettings {
	enabled: boolean,
	region?: string,
	bucket?: string,
	accessKey?: string,
	secret?: string,
	endpoint?: string,
	publicURLPrefix?: string,
}

export type ImgS3PluginSettings_Result = {
	action: string;
	values: ImgS3PluginSettings;
};

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

export interface AIModelSetting extends AIModel {
	settingKey: string;
	rawApiKey: string;
  }

export type AIModelSetting_Result = {
	action: string;
	values: AIModelSetting[];
};

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