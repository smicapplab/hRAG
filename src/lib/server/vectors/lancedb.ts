import * as lancedb from '@lancedb/lancedb';
import type { VectorStore, SearchResult } from './interfaces';

export class LanceDBVectorStore implements VectorStore {
    private dbPromise: Promise<lancedb.Connection>;
    private table: lancedb.Table | null = null;
    private readonly tableName = 'chunks';

    constructor(uri: string) {
        this.dbPromise = lancedb.connect(uri);
    }

    private escape(val: string): string {
        return val.replace(/'/g, "''");
    }

    private async getTable() {
        if (this.table) return this.table;
        const db = await this.dbPromise;
        const tables = await db.tableNames();
        if (tables.includes(this.tableName)) {
            this.table = await db.openTable(this.tableName);
            return this.table;
        }
        // Initial schema creation happens on first add
        return null;
    }

    async addDocument(docId: string, chunks: { text: string; vector: number[] }[], ownerId: string, accessIds: string[]) {
        const db = await this.dbPromise;
        const data = chunks.map(c => ({
            vector: c.vector,
            text: c.text,
            doc_id: docId,
            owner_id: ownerId,
            access_ids: accessIds,
            created_at: new Date().toISOString()
        }));

        let table = await this.getTable();
        if (table) {
            await table.delete(`doc_id = '${this.escape(docId)}'`);
            await table.add(data);
        } else {
            this.table = await db.createTable(this.tableName, data);
            await this.table.createIndex('owner_id');
        }
    }

    async deleteDocument(docId: string) {
        const table = await this.getTable();
        if (table) await table.delete(`doc_id = '${this.escape(docId)}'`);
    }

    async updateAccess(docId: string, accessIds: string[]) {
        const table = await this.getTable();
        if (table) {
            // Update the access_ids for all chunks belonging to this document.
            // Note: Native update is available in LanceDB Node.js SDK.
            // Using a cast to any to avoid type issues with array updates in some versions of the SDK.
            await table.update({ access_ids: accessIds as any }, { where: `doc_id = '${this.escape(docId)}'` });
        }
    }

    async search(vector: number[], filter: { userId: string; groupIds: string[] }, limit = 5): Promise<SearchResult[]> {
        const table = await this.getTable();
        if (!table) return [];

        // Dynamic token generation: u:id, g:id, r:global
        const tokens = [
            `u:${this.escape(filter.userId)}`,
            ...filter.groupIds.map(id => `g:${this.escape(id)}`),
            'r:global'
        ];

        // Construct SQL filter (membership check for LanceDB)
        const tokenClauses = tokens.map(t => `array_has(access_ids, '${t}')`).join(' OR ');
        const whereClause = `(owner_id = '${this.escape(filter.userId)}') OR (${tokenClauses})`;

        const results = await table
            .search(vector)
            .where(whereClause)
            .limit(limit)
            .toArray();

        return results.map(r => ({
            docId: r.doc_id as string,
            text: r.text as string,
            score: r._distance as number,
            metadata: { owner_id: r.owner_id, access_ids: r.access_ids }
        }));
    }
}
