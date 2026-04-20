import { TextProcessor } from './processors/text';
import { PdfProcessor } from './processors/pdf';
import { OcrProcessor } from './processors/ocr';
import { OfficeProcessor } from './processors/office';
import type { IngestionResult } from './interfaces';

const processors = [
	new TextProcessor(),
	new PdfProcessor(),
	new OfficeProcessor(),
	new OcrProcessor()
];

export async function ingestDocument(buffer: Buffer, mimeType: string): Promise<IngestionResult> {
	const processor = processors.find((p) => p.canHandle(mimeType));
	if (!processor) {
		throw new Error(`Unsupported MIME type: ${mimeType}`);
	}

	try {
		return await processor.process(buffer, mimeType);
	} catch (err: any) {
		if (err.message === 'PDF_NEEDS_OCR') {
			const ocrProcessor = new OcrProcessor();
			return await ocrProcessor.process(buffer, mimeType);
		}
		throw err;
	}
}
