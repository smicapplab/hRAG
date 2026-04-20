import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { DocumentProcessor, IngestionResult } from '../interfaces';

export class OfficeProcessor implements DocumentProcessor {
	private splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 512,
		chunkOverlap: 64
	});

	canHandle(mimeType: string): boolean {
		return [
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		].includes(mimeType);
	}

	async process(buffer: Buffer, mimeType: string): Promise<IngestionResult> {
		let text = '';
		if (mimeType.includes('word')) {
			const result = await mammoth.extractRawText({ buffer });
			text = result.value;
		} else {
			const workbook = xlsx.read(buffer, { type: 'buffer' });
			workbook.SheetNames.forEach((name) => {
				const sheet = workbook.Sheets[name];
				text += xlsx.utils.sheet_to_csv(sheet) + '\n';
			});
		}

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
