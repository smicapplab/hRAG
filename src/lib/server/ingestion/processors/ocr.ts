import { createWorker } from 'tesseract.js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { DocumentProcessor, IngestionResult } from '../interfaces';

export class OcrProcessor implements DocumentProcessor {
	private splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 512,
		chunkOverlap: 64
	});

	canHandle(mimeType: string): boolean {
		return mimeType.startsWith('image/');
	}

	async process(buffer: Buffer, mimeType: string): Promise<IngestionResult> {
		const worker = await createWorker('eng');
		const {
			data: { text }
		} = await worker.recognize(buffer);
		await worker.terminate();

		const docs = await this.splitter.createDocuments([text]);

		return {
			chunks: docs.map((d) => ({ text: d.pageContent, metadata: {} })),
			metadata: {
				mimeType,
				wordCount: text.split(/\s+/).length
			}
		};
	}
}
