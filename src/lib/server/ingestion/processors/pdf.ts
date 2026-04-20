import pdf from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { DocumentProcessor, IngestionResult } from '../interfaces';

export class PdfProcessor implements DocumentProcessor {
	private splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 512,
		chunkOverlap: 64
	});

	canHandle(mimeType: string): boolean {
		return mimeType === 'application/pdf';
	}

	async process(buffer: Buffer, mimeType: string): Promise<IngestionResult> {
		const data = await pdf(buffer);
		const text = data.text;

		// If text is extremely short, it might be a scanned PDF (needs OCR)
		if (text.trim().length < 10 && data.numpages > 0) {
			throw new Error('PDF_NEEDS_OCR');
		}

		const docs = await this.splitter.createDocuments([text]);

		return {
			chunks: docs.map((d) => ({ text: d.pageContent, metadata: {} })),
			metadata: {
				mimeType,
				pageCount: data.numpages,
				wordCount: text.split(/\s+/).length
			}
		};
	}
}
