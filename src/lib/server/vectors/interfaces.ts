export interface SearchResult {
	docId: string;
	text: string;
	score: number;
	metadata: Record<string, unknown>;
}

export interface EmbeddingProvider {
	embed(text: string): Promise<number[]>;
	getDimensions(): number;
}

export interface VectorStore {
	/**
	 * Add chunks with mandatory security metadata.
	 * Implementation MUST delete any existing chunks for this docId first.
	 */
	addDocument(
		docId: string,
		chunks: { text: string; vector: number[] }[],
		ownerId: string,
		accessIds: string[]
	): Promise<void>;

	/**
	 * Search with Hard-Filter.
	 */
	search(
		vector: number[],
		filter: { userId: string; groupIds: string[] },
		limit?: number
	): Promise<SearchResult[]>;

	/** Physical delete of all chunks for a document. */
	deleteDocument(docId: string): Promise<void>;

	/** Update ACLs for existing chunks (sync from SQLite). */
	updateAccess(docId: string, accessIds: string[]): Promise<void>;
}
