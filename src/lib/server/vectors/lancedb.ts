import * as lancedb from '@lancedb/lancedb';
import { env } from '$env/dynamic/private';
import type { VectorStore, VectorDocument, SecurityFilter } from './index';

export class LanceDBStore implements VectorStore {
    private db: lancedb.Connection | null = null;
    private readonly tableName = 'hrag_vectors';

    async initialize(): Promise<void> {
        if (this.db) return;

        // Initialize S3 connection for LanceDB if S3_ENDPOINT is present
        // Default to a local path if S3 environment variables are not found (e.g., local dev without Garage S3)
        let uri = env.LANCEDB_URI;
        if (!uri) {
            if (env.S3_ENDPOINT) {
                // Remove trailing slash and http/https; lancedb uses s3:// convention
                const endpoint = env.S3_ENDPOINT.replace(/^https?:\/\//, '');
                uri = `s3://${endpoint}/hrag-vectors`;
            } else {
                uri = 'data/lancedb';
            }
        }

        const storageOptions: Record<string, string> = {};
        if (env.S3_ENDPOINT) {
            // Passing AWS credentials via storageOptions directly
            storageOptions.awsEndpoint = env.S3_ENDPOINT;
            storageOptions.awsAccessKeyId = env.S3_ACCESS_KEY || '';
            storageOptions.awsSecretAccessKey = env.S3_SECRET_KEY || '';
            storageOptions.awsRegion = env.S3_REGION || 'us-east-1'; // Default for Garage S3
            storageOptions.awsAllowHttp = env.S3_ENDPOINT.startsWith('http://').toString();
        }

        this.db = await lancedb.connect(uri, { storageOptions });
    }

    async addDocuments(documents: VectorDocument[]): Promise<void> {
        if (!this.db) await this.initialize();
        if (documents.length === 0) return;
        
        // Flatten array fields for LanceDB SQL compatibility
        const data = documents.map(doc => ({
            id: doc.id,
            docId: doc.docId,
            text: doc.text,
            vector: doc.vector,
            ownerId: doc.ownerId,
            // Pack accessIds into a single string for LIKE searches (engine-level unified ACL filtering)
            accessIds: doc.accessIds.join(','), 
            metadata: JSON.stringify(doc.metadata || {})
        }));

        const tableNames = await this.db!.tableNames();
        if (tableNames.includes(this.tableName)) {
            const table = await this.db!.openTable(this.tableName);
            await table.add(data);
        } else {
            await this.db!.createTable(this.tableName, data);
        }
    }

    async deleteDocuments(docIds: string[]): Promise<void> {
        if (!this.db) await this.initialize();
        if (docIds.length === 0) return;

        const tableNames = await this.db!.tableNames();
        if (!tableNames.includes(this.tableName)) return;
        
        const table = await this.db!.openTable(this.tableName);
        // Using IN clause for multi-delete
        const idList = docIds.map(id => `'${id}'`).join(', ');
        await table.delete(`docId IN (${idList})`);
    }

    async similaritySearch(
        queryVector: number[],
        limit: number,
        securityFilter: SecurityFilter
    ): Promise<VectorDocument[]> {
        if (!this.db) await this.initialize();
        const tableNames = await this.db!.tableNames();
        if (!tableNames.includes(this.tableName)) return [];

        const table = await this.db!.openTable(this.tableName);

        // GEMINI.md Mandate: Iron-Clad Vector Search
        // Hard-Filtering: Mandatory engine-level filtering using "Unified ACL" metadata (`owner_id` + prefixed `access_ids`).
        // Private-by-Default: Queries must always anchor on `owner_id` to ensure creators always have access even if sharing is null.

        const accessConditions: string[] = [];
        accessConditions.push(`accessIds LIKE '%public:true%'`);
        for (const groupId of securityFilter.groupIds) {
            accessConditions.push(`accessIds LIKE '%group:${groupId}%'`);
        }
        
        const filterStr = `ownerId = '${securityFilter.userId}' OR ${accessConditions.join(' OR ')}`;

        const results = await table.search(queryVector)
            .limit(limit)
            .where(filterStr)
            .toArray();

        return results.map(row => ({
            id: row.id as string,
            docId: row.docId as string,
            text: row.text as string,
            vector: row.vector as number[],
            ownerId: row.ownerId as string,
            accessIds: (row.accessIds as string).split(',').filter(Boolean),
            metadata: JSON.parse((row.metadata as string) || '{}')
        }));
    }
}
