import { z } from 'zod';

export interface ImgOptimizerPluginSettings {
	imageFormat: string; // webp | avif | png
	compressionLevel: number,
	apiServer: string,
	useS3Storage: boolean,
}

export const stringOrEmptySchema = z.union([
	z.string().transform((val) => val), // If it's a string, return it as is
	z.number().transform((val) => val.toString()), // If it's a number, convert to string
	z.unknown().transform(() => '') // If it's neither, return an empty string
  ]);