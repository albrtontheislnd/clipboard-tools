import { exec, execFile } from "child_process";
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

function escapeFilePath(filePath: string): string {
	// Escape any special shell characters and wrap in quotes
	return `"${filePath.replace(/(["\s'$`\\])/g, (c) => ({ '"': '\\"', '\\': '\\\\', '$': '\\$', '`': '\\`', "'": "\\'" }[c] || `\\${c}`))}"`;
}

export class tUtils {
	static getUnixTimestamp(): number {
		return Math.floor(Date.now() / 1000);
	  }

	static escapeFilePath(filePath: string): string {
		// Escape any special shell characters and wrap in quotes
		return `"${filePath.replace(/(["\s'$`\\])/g, '\\$1')}"`;
	}

/**
 * Maps a user-provided quality value from a scale of 1 to 100 to the AVIF quality scale of 1 to 63.
 * The mapping is performed in reverse order, where a higher user quality corresponds to a lower AVIF quality.
 * 
 * @param {number} userQuality - The desired quality on a scale from 1 to 100.
 * @returns {number} - The calculated AVIF quality on a scale from 1 to 63.
 */
	static mapQualityToAvif(userQuality: number): number {
		// Clamp user input to the range 1 to 100
		const clampedQuality = Math.max(1, Math.min(userQuality, 100));
	
		// Map the 1-100 range to the 1-63 AVIF range in reverse
		const avifQuality = Math.round((100 - clampedQuality) * (62 / 99)) + 1;
	
		return avifQuality;
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
				const avifQuality = tUtils.mapQualityToAvif(quality);
				args = [
					'-i', inputFilePath,             // Input file path
					'-c:v', 'libaom-av1',        // AVIF codec
					'-crf', avifQuality.toString(),  // Quality setting (Constant Rate Factor for AVIF)
					'-pix_fmt', 'yuv420p',			// Sets 4:2:0 chroma subsampling, which is compatible with most browsers
					'-y',                        // Overwrite output if it exists
					outputFilePath                   // Output file path
				  ];
				console.log(args);

				break;

			case 'magick':
				args = [inputFilePath, '-quality', `${quality}`, outputFilePath];
				console.log(args);
				
				break;

			case 'vips':
				// vips copy input.png output.avif[Q=80]
				args = [
					'copy',
					inputFilePath,
					`${outputFilePath}[Q=${quality.toString()}]`];
				console.log(args);
				break;

			default:
				// not a valid app
				return { stdout: '', stderr: '', result: false };
				break;
		}

		try {
			const { stdout, stderr } = await execFilePromise(progPath, args);
			try {
				await fs.access(outputFilePath, fs.constants.R_OK);
				// checking: not a zero-bytes file
				const outputSize = (await fs.stat(outputFilePath)).size;
				if(outputSize === 0) {
					await fs.unlink(outputFilePath);
					throw new Error(`Zero-bytes file.`);
				}
			  } catch(error) {
				throw new Error(error);
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