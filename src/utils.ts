import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as path from "path";

function execFilePromise(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
	  execFile(command, args, (error, stdout, stderr) => {
		if (error) {
		  reject(`Error: ${error.message}\nStderr: ${stderr}`);
		} else {
		  resolve({ stdout, stderr });
		}
	  });
	});
}

export class tUtils {
	/**
	 * Maps a user-provided quality value from a scale of 1 to 100 to the AVIF quality scale of 1 to 63.
	 * The mapping is performed in reverse order, where a higher user quality corresponds to a lower AVIF quality.
	 * 
	 * @param {number} userQuality - The desired quality on a scale from 1 to 100.
	 * @returns {number} - The calculated AVIF quality on a scale from 1 to 63.
	 */
	static mapQualityToAvif(userQuality: number): number {
		return Math.max(1, 64 - Math.round(userQuality * 0.63));
	}

	static async convertImage(progPath: string, inputFilePath: string, outputFilePath: string, quality: number): Promise<{
		stdout: string, 
		stderr: string,
		result: boolean,
	}> {
		const appCheck = await tUtils.findProgPath(progPath);
		const app = path.basename(String(appCheck), process.platform === 'win32' ? '.exe' : '').toLowerCase();
		let args;

		switch (app) {
			case 'ffmpeg':
				args = [
					'-i', inputFilePath,             // Input file path
					'-c:v', 'libaom-av1',        // AVIF codec
					'-crf', String(tUtils.mapQualityToAvif(quality)),  // Quality setting (Constant Rate Factor for AVIF)
					'-pix_fmt', 'yuv420p',			// Sets 4:2:0 chroma subsampling, which is compatible with most browsers
					'-y',                        // Overwrite output if it exists
					outputFilePath                   // Output file path
				  ];
				break;

			case 'magick':
				args = [inputFilePath, '-quality', `${quality}`, outputFilePath];
				break;

			case 'vips':
				// vips copy input.png output.avif[Q=80]
				args = [
					'copy',
					inputFilePath,
					`${outputFilePath}[Q=${quality.toString()}]`];
				break;

			default:
				// not a valid app
				return { stdout: '', stderr: '', result: false };
				break;
		}

		try {
			const { stdout, stderr } = await execFilePromise(progPath, args);
			const outputSize = (await fs.stat(outputFilePath)).size;
			if(outputSize === 0) {
				await fs.unlink(outputFilePath);
				throw new Error(`Zero-bytes file.`);
			}

			return {
				stdout: stdout,
				stderr: stderr,
				result: true,
			};
		} catch (error) {
			console.error(`${app.toUpperCase()} execution error:`, error);
			return { stdout: '', stderr: '', result: false };
		}
	}

	static async findProgPath(filePath: string): Promise<string | null> {
		const execFile = path.basename(filePath, process.platform === 'win32' ? '.exe' : '').toLowerCase();
		if (['magick', 'ffmpeg', 'vips'].includes(execFile)) {
			try {
				await fs.access(filePath, fs.constants.X_OK);
				return filePath;
			} catch {
				return null;
			}
		}
		return null;
	}
 }