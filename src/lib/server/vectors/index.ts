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
    authorizedDocIds?: string[];
    mandatoryDocIds?: string[]; // Documents MUST be in this list (intersection with ACL)
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

    /**
     * Update access control lists for all chunks of a document.
     * This is used to synchronize permissions from the relational database.
     */
    updateAccess(docId: string, accessIds: string[]): Promise<void>;
}

let storeInstance: VectorStore | null = null;
let initializationPromise: Promise<VectorStore> | null = null;

/**
 * Factory pattern to retrieve the active VectorStore implementation.
 * Uses a promise to prevent race conditions during multiple concurrent initializations.
 */
export async function getVectorStore(): Promise<VectorStore> {
    if (storeInstance) return storeInstance;
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        const { env } = await import('$env/dynamic/private');
        const provider = (env.VECTOR_STORE_TYPE || 'lancedb').toLowerCase();

        let instance: VectorStore;
        if (provider === 'lancedb') {
            const { LanceDBStore } = await import('./lancedb');
            instance = new LanceDBStore();
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        await instance.initialize();
        storeInstance = instance;
        return storeInstance;
    })();

    return initializationPromise;
}
