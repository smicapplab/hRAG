export interface VectorDocument {
    id: string;
    docId: string; // Relational Document ID
    text: string;
    vector: number[];
    ownerId: string;
    accessIds: string[]; // E.g., ['group:123', 'public:true']
    metadata: Record<string, any>;
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
