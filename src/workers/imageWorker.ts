/// <reference lib="webworker" />

interface ConvertImageOp {
	operation: 'convertImage';
	id: string;
	buffer: ArrayBuffer;
	type: string;
	format: string;
	quality: number;
}

interface OptimizeImageOp {
	operation: 'optimizeImage';
	id: string;
	buffer: ArrayBuffer;
	type: string;
	maxWidth: number;
	maxHeight: number;
}

type WorkerOp = ConvertImageOp | OptimizeImageOp;

self.onmessage = async (e: MessageEvent<WorkerOp>) => {
	const { operation, id, buffer, type } = e.data;
	try {
		const blob = new Blob([buffer], { type });
		const bitmap = await createImageBitmap(blob);

		let canvas: OffscreenCanvas;

		if (operation === 'convertImage') {
			const { format, quality } = e.data;
			canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0);

			const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
			const qualityValue = Math.max(0.01, Math.min(1, quality / 100));
			const result = await canvas.convertToBlob({ type: mimeType, quality: qualityValue });

			const resultBuffer = await result.arrayBuffer();
			self.postMessage({ id, buffer: resultBuffer }, [resultBuffer]);
		} else {
			// optimizeImage: resize to maxWidth/maxHeight, keep aspect ratio
			const { maxWidth, maxHeight } = e.data;
			let w = bitmap.width;
			let h = bitmap.height;

			if (w > maxWidth || h > maxHeight) {
				const ratio = w / h;
				if (w > h) {
					w = maxWidth;
					h = Math.floor(maxWidth / ratio);
				} else {
					h = maxHeight;
					w = Math.floor(maxHeight * ratio);
				}
			}

			canvas = new OffscreenCanvas(w, h);
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0, w, h);

			const result = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });

			const resultBuffer = await result.arrayBuffer();
			self.postMessage({ id, buffer: resultBuffer }, [resultBuffer]);
		}

		bitmap.close();
	} catch (err) {
		self.postMessage({ id, error: err instanceof Error ? err.message : 'Worker error' });
	}
};