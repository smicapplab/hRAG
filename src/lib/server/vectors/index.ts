export interface VectorDocument {
    id: string;
    docId: string; // Relational Document ID
    text: string;
    vector: number[];
    ownerId: string;
    accessIds: string[]; // E.g., ['group:123', 'public:true']
    metadata: Record<string, any>;
    _distance?: number; // LanceDB similarity distance (lower = more relevant)
}

export interface SecurityFilter {
    userId: string;
    groupIds: string[];
}

export interface VectorStore {
    /**
     * Initialize the connection to the vector store
     */
    initialize(): Promise<void>;

    /**
     * Add or update documents in the vector store
     */
    addDocuments(documents: VectorDocument[]): Promise<void>;

    /**
     * Delete documents from the vector store by their relational Document ID
     */
    deleteDocuments(docIds: string[]): Promise<void>;

    /**
     * Perform a similarity search with mandatory security filtering
     * 
     * @param queryVector The embedding array
     * @param limit Maximum number of results
     * @param securityFilter Context to enforce Private-by-Default and ACLs
     */
    similaritySearch(
        queryVector: number[],
        limit: number,
        securityFilter: SecurityFilter
    ): Promise<VectorDocument[]>;
}

let storeInstance: VectorStore | null = null;

/**
 * Factory pattern to retrieve the active VectorStore implementation.
 */
export async function getVectorStore(): Promise<VectorStore> {
    if (storeInstance) return storeInstance;

    const { env } = await import('$env/dynamic/private');
    const provider = (env.VECTOR_STORE_TYPE || 'lancedb').toLowerCase();

    if (provider === 'lancedb') {
        const { LanceDBStore } = await import('./lancedb');
        storeInstance = new LanceDBStore();
    } else if (provider === 'qdrant') {
        throw new Error('QdrantStore is not yet implemented.');
    } else {
        throw new Error(`Unknown vector store provider: ${provider}`);
    }

    await storeInstance.initialize();
    return storeInstance;
}
