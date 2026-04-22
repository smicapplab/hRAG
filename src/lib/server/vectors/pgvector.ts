import { db } from '../db';
import { systemSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { pgTable, text, vector, jsonb } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import type { VectorStore, VectorDocument, SecurityFilter } from './index';

/**
 * Enterprise PgVector Store
 * Leverages pgvector for high-performance vector search in Postgres.
 */
export class PgVectorStore implements VectorStore {
    private pool: any;
    private db: any;
    private tableName: string = 'vectors';

    async initialize(): Promise<void> {
        const url = process.env.DATABASE_URL; // Or registry setting
        this.pool = new Pool({ connectionString: url });
        this.db = drizzle(this.pool);
        
        // Ensure pgvector extension is enabled
        await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        
        // Define dynamic table
        // Note: In production, we'd use a more robust schema management
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id UUID PRIMARY KEY,
                doc_id UUID NOT NULL,
                text TEXT NOT NULL,
                vector vector(1536),
                owner_id TEXT NOT NULL,
                access_ids TEXT[] NOT NULL,
                metadata JSONB NOT NULL
            )
        `);
    }

    async addDocuments(documents: VectorDocument[]): Promise<void> {
        for (const doc of documents) {
            await this.db.insert(this.tableName as any).values({
                id: doc.id,
                doc_id: doc.docId,
                text: doc.text,
                vector: JSON.stringify(doc.vector),
                owner_id: doc.ownerId,
                access_ids: doc.accessIds,
                metadata: doc.metadata
            });
        }
    }

    async deleteDocuments(docIds: string[]): Promise<void> {
        await this.db.delete(this.tableName as any).where(inArray(this.tableName.doc_id, docIds));
    }

    async similaritySearch(
        queryVector: number[],
        limit: number,
        securityFilter: SecurityFilter
    ): Promise<VectorDocument[]> {
        // Build ACL filter: (ownerId = ? OR accessIds && ?)
        // Using pgvector cosine distance operator <=>
        const accessFilter = `access_ids && ARRAY[${securityFilter.groupIds.map(g => `'g:${g}'`).join(',')}]::text[]`;
        
        const query = `
            SELECT *, 1 - (vector <=> $1::vector) as distance
            FROM ${this.tableName}
            WHERE (owner_id = $2 OR ${accessFilter} OR access_ids @> ARRAY['r:global']::text[])
            ORDER BY distance DESC
            LIMIT $3
        `;

        const { rows } = await this.pool.query(query, [JSON.stringify(queryVector), securityFilter.userId, limit]);
        
        return rows.map((row: any) => ({
            id: row.id,
            docId: row.doc_id,
            text: row.text,
            vector: row.vector,
            ownerId: row.owner_id,
            accessIds: row.access_ids,
            metadata: row.metadata,
            _distance: 1 - row.distance
        }));
    }

    async updateAccess(docId: string, accessIds: string[]): Promise<void> {
        await this.db.update(this.tableName as any)
            .set({ access_ids: accessIds })
            .where(eq(this.tableName.doc_id, docId));
    }
}
