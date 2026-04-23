import * as lancedb from '@lancedb/lancedb';
import * as dotenv from 'dotenv';
import type { VectorStore, VectorDocument, SecurityFilter } from './index';

if (typeof process !== 'undefined') {
    dotenv.config();
}

export class LanceDBStore implements VectorStore {
    private db: lancedb.Connection | null = null;
    private readonly tableName = 'hrag_vectors';

    async initialize(): Promise<void> {
        if (this.db) return;

        // Initialize S3 connection for LanceDB if S3_ENDPOINT is present
        // Default to a local path if S3 environment variables are not found (e.g., local dev without Garage S3)
        let uri = process.env.LANCEDB_URI;
        if (!uri) {
            if (process.env.S3_ENDPOINT) {
                // S3 URI format is s3://<bucket>/<path>
                // We provide the endpoint in storageOptions
                uri = `s3://hrag-vectors`;
            } else {
                uri = 'data/lancedb';
            }
        }

        const storageOptions: Record<string, string> = {};
        if (process.env.S3_ENDPOINT) {
            // Passing AWS credentials via storageOptions directly
            storageOptions.awsEndpoint = process.env.S3_ENDPOINT;
            storageOptions.awsAccessKeyId = process.env.S3_ACCESS_KEY || '';
            storageOptions.awsSecretAccessKey = process.env.S3_SECRET_KEY || '';
            storageOptions.awsRegion = process.env.S3_REGION || 'us-east-1'; // Default for Garage S3
            storageOptions.awsAllowHttp = process.env.S3_ENDPOINT.startsWith('http://').toString();
            
            const { ensureBucket } = await import('../security/s3');
            await ensureBucket('hrag-vectors');
        }

        this.db = await lancedb.connect(uri, { storageOptions });
    }

    async addDocuments(documents: VectorDocument[]): Promise<void> {
        if (!this.db) await this.initialize();
        if (documents.length === 0) return;

        const tableNames = await this.db!.tableNames();
        let table: lancedb.Table | undefined;
        
        if (tableNames.includes(this.tableName)) {
            table = await this.db!.openTable(this.tableName);
            
            // Spec 3.1: Delete existing chunks for these docIds first to prevent duplicates
            const docIds = [...new Set(documents.map(d => d.docId))];
            const idList = docIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
            await table.delete(`docId IN (${idList})`);
        }
        
        // Flatten array fields for LanceDB SQL compatibility
        const data = documents.map(doc => ({
            id: doc.id,
            docId: doc.docId,
            text: doc.text,
            vector: doc.vector,
            ownerId: doc.ownerId,
            // Pack accessIds with bounding commas for exact LIKE matching
            // Standardized format: ,u:id,g:id,r:global,
            accessIds: `,${doc.accessIds.join(',')},`, 
            metadata: JSON.stringify(doc.metadata || {})
        }));

        if (table) {
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
async updateAccess(docId: string, accessIds: string[]): Promise<void> {
    if (!this.db) await this.initialize();
    const tableNames = await this.db!.tableNames();
    if (!tableNames.includes(this.tableName)) return;

    const table = await this.db!.openTable(this.tableName);

    // Sanitize docId to prevent injection
    const safeDocId = docId.replace(/'/g, "''");
    // Pack accessIds with bounding commas for exact LIKE matching
    // We MUST wrap the value in single quotes because LanceDB update values are SQL expressions.
    const formattedAccessIds = `',${accessIds.join(',').replace(/'/g, "''")},'`;

    await table.update({ accessIds: formattedAccessIds }, { where: `docId = '${safeDocId}'` });
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

        const tokens = [
            `u:${securityFilter.userId}`,
            ...securityFilter.groupIds.map(id => `g:${id}`),
            'r:global'
        ];

        // Sanitize userId to prevent injection in ownerId check
        const safeUserId = securityFilter.userId.replace(/'/g, "''");
        
        // Use LIKE with bounding commas for exact prefix match
        const accessConditions = tokens.map(t => `accessIds LIKE '%,${t},%'`).join(' OR ');
        let filterStr = `ownerId = '${safeUserId}' OR ${accessConditions}`;

        if (securityFilter.authorizedDocIds && securityFilter.authorizedDocIds.length > 0) {
            // Cap at 5,000 to prevent engine overload
            const cappedIds = securityFilter.authorizedDocIds.slice(0, 5000);
            if (securityFilter.authorizedDocIds.length > 5000) {
                console.warn(`[LanceDB] Search for user ${securityFilter.userId} capped at 5000 authorized IDs.`);
            }
            
            const idList = cappedIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
            filterStr = `(${filterStr}) OR docId IN (${idList})`;
        }

        if (securityFilter.mandatoryDocIds && securityFilter.mandatoryDocIds.length > 0) {
            // Cap at 5,000 to prevent engine overload
            const cappedIds = securityFilter.mandatoryDocIds.slice(0, 5000);
            const idList = cappedIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
            filterStr = `(${filterStr}) AND docId IN (${idList})`;
        }

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
            metadata: JSON.parse((row.metadata as string) || '{}'),
            // Preserve LanceDB distance score for ranking (lower = more similar)
            _distance: row._distance as number | undefined
        }));
    }

    async scan(callback: (documents: VectorDocument[]) => Promise<void>): Promise<void> {
        if (!this.db) await this.initialize();
        const tableNames = await this.db!.tableNames();
        if (!tableNames.includes(this.tableName)) return;

        const table = await this.db!.openTable(this.tableName);
        
        // LanceDB scan returns a Query object that we can iterate
        const results = await table.query().toArray();
        
        // Chunk the results to avoid memory pressure in callback
        const chunkSize = 100;
        for (let i = 0; i < results.length; i += chunkSize) {
            const chunk = results.slice(i, i + chunkSize);
            const mapped = chunk.map(row => ({
                id: row.id as string,
                docId: row.docId as string,
                text: row.text as string,
                vector: row.vector as number[],
                ownerId: row.ownerId as string,
                accessIds: (row.accessIds as string).split(',').filter(Boolean),
                metadata: JSON.parse((row.metadata as string) || '{}')
            }));
            await callback(mapped);
        }
    }

    async fetchFragments(docId: string, limit = 50, offset = 0): Promise<{ fragments: VectorDocument[], total: number }> {
        if (!this.db) await this.initialize();
        const tableNames = await this.db!.tableNames();
        if (!tableNames.includes(this.tableName)) return { fragments: [], total: 0 };

        const table = await this.db!.openTable(this.tableName);
        
        // Sanitize docId
        const safeDocId = docId.replace(/'/g, "''");
        
        // 1. Get total count for this docId
        const allResults = await table.query()
            .where(`docId = '${safeDocId}'`)
            .select(['id'])
            .toArray();
        
        const total = allResults.length;

        // 2. Fetch paginated fragments
        const results = await table.query()
            .where(`docId = '${safeDocId}'`)
            .limit(limit)
            .offset(offset)
            .toArray();

        const fragments = results.map(row => ({
            id: row.id as string,
            docId: row.docId as string,
            text: row.text as string,
            vector: row.vector as number[],
            ownerId: row.ownerId as string,
            accessIds: (row.accessIds as string).split(',').filter(Boolean),
            metadata: JSON.parse((row.metadata as string) || '{}')
        }));

        return { fragments, total };
    }
}
