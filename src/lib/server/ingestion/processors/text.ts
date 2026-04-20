import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { DocumentProcessor, IngestionResult } from '../interfaces';

export class TextProcessor implements DocumentProcessor {
	private splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 512,
		chunkOverlap: 64
	});

	canHandle(mimeType: string): boolean {
		return ['text/plain', 'text/markdown', 'application/json', 'text/csv'].includes(mimeType);
	}

	async process(buffer: Buffer, mimeType: string): Promise<IngestionResult> {
		const text = buffer.toString('utf8');
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
