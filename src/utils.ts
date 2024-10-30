import { exec, execFile } from "child_process";
import { promises as fs } from "fs";

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

function execPromise(cmd: string): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		exec(cmd, (error, stdout, stderr) => {
		if (error) {
			reject(`Error: ${error.message}\nStderr: ${stderr}`);
			return;
		}
		resolve({ stdout, stderr });
		});
	});
}

function escapeFilePath(filePath: string): string {
	if (process.platform === 'win32') {
	  // For Windows: escape backslashes and wrap in quotes
	  return `"${filePath.replace(/(["\s'$`\\])/g, '\\$1')}"`;
	} else {
	  // For Unix-like OSes:
	  return `'${filePath.replace(/'/g, `'\\''`)}'`;
	}
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

		const checkFfmpeg = await tUtils.isFfmpegPath(progPath);
		const checkImageMagick = await tUtils.isImageMagickPath(progPath);
		
		if(checkFfmpeg && !checkImageMagick) {
			// ffmpeg
			const avifQuality = tUtils.mapQualityToAvif(quality);
			const args = [
				'-i', inputFilePath,             // Input file path
				'-c:v', 'libaom-av1',        // AVIF codec
				'-crf', avifQuality.toString(),  // Quality setting (Constant Rate Factor for AVIF)
				'-y',                        // Overwrite output if it exists
				outputFilePath                   // Output file path
			  ];
			console.log(args);

			try {
				const { stdout, stderr } = await execFilePromise(progPath, args);
				try {
					await fs.access(outputFilePath);
				  } catch {
					throw new Error(`Output file not found: ${outputFilePath}`);
				  }

				return {
					stdout: stdout,
					stderr: stderr,
					result: true,
				};
			} catch (error) {
				console.error("ffmpeg execution error:", error);
			}
		} else if(checkImageMagick && !checkFfmpeg) {
			// ImageMagick
			const args = [inputFilePath, '-quality', `${quality}`, outputFilePath];
			console.log(args);

			try {
				const { stdout, stderr } = await execFilePromise(progPath, args);
				try {
					await fs.access(outputFilePath);
				  } catch {
					throw new Error(`Output file not found: ${outputFilePath}`);
				  }

				return {
					stdout: stdout,
					stderr: stderr,
					result: true,
				};
			} catch (error) {
				console.error("ImageMagick execution error:", error);
			}
		} else {
			return {
				stdout: '',
				stderr: '',
				result: false,
			};
		}

		return {
			stdout: '',
			stderr: '',
			result: false,
		};
	  }

	static async isFfmpegPath(filePath: string): Promise<boolean> {
		const isWindows = process.platform === 'win32';
		const executable = isWindows ? 'ffmpeg.exe' : 'ffmpeg';

		if(!filePath.endsWith(executable)) return false;

		// Windows specific check (needs .exe)
		if (isWindows) {
			return fs.access(filePath, fs.constants.F_OK)
				.then(() => true)
				.catch(() => false);
		} else {
			// Unix-like systems
			return fs.access(filePath, fs.constants.F_OK | fs.constants.X_OK)
				.then(() => true)
				.catch(() => false);
		}
	}

	static async isImageMagickPath(filePath: string): Promise<boolean> {
		const isWindows = process.platform === 'win32';
		const executable = isWindows ? 'magick.exe' : 'magick';

		if(!filePath.endsWith(executable)) return false;

		// Windows specific check (needs .exe)
		if (isWindows) {
			return fs.access(filePath, fs.constants.F_OK)
				.then(() => true)
				.catch(() => false);
		} else {
			// Unix-like systems
			return fs.access(filePath, fs.constants.F_OK | fs.constants.X_OK)
				.then(() => true)
				.catch(() => false);
		}
	}
}