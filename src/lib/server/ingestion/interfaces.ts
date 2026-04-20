export interface ProcessedChunk {
	text: string;
	metadata: Record<string, any>;
}

export interface IngestionResult {
	chunks: ProcessedChunk[];
	metadata: {
		pageCount?: number;
		wordCount?: number;
		mimeType: string;
	};
}

export interface DocumentProcessor {
	canHandle(mimeType: string): boolean;
	process(buffer: Buffer, mimeType: string): Promise<IngestionResult>;
}
