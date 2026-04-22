import { db } from '../db';
import { systemSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { pgTable, text, vector, jsonb } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import type { VectorStore, VectorDocument, SecurityFilter } from './index';
import { getSetting } from '../admin/registry';

/**
 * Enterprise PgVector Store
 * Leverages pgvector for high-performance vector search in Postgres.
 */
export class PgVectorStore implements VectorStore {
    private pool: any;
    private db: any;
    private tableName: string = 'vectors';

    async initialize(): Promise<void> {
        // Retrieve connection string from registry with env fallback
        const url = await getSetting('vectors.pg.url', process.env.VECTOR_DATABASE_URL || process.env.DATABASE_URL);
        
        if (!url) throw new Error('No connection string configured for PgVectorStore.');
        
        this.pool = new Pool({ connectionString: url });
        this.db = drizzle(this.pool);
        
        // Ensure pgvector extension is enabled
        await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        
        // Define dynamic table
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
            await this.pool.query(`
                INSERT INTO ${this.tableName} (id, doc_id, text, vector, owner_id, access_ids, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    doc_id = EXCLUDED.doc_id,
                    text = EXCLUDED.text,
                    vector = EXCLUDED.vector,
                    owner_id = EXCLUDED.owner_id,
                    access_ids = EXCLUDED.access_ids,
                    metadata = EXCLUDED.metadata
            `, [
                doc.id,
                doc.docId,
                doc.text,
                `[${doc.vector.join(',')}]`,
                doc.ownerId,
                doc.accessIds,
                JSON.stringify(doc.metadata)
            ]);
        }
    }

    async deleteDocuments(docIds: string[]): Promise<void> {
        if (docIds.length === 0) return;
        await this.pool.query(`DELETE FROM ${this.tableName} WHERE doc_id = ANY($1)`, [docIds]);
    }

    async similaritySearch(
        queryVector: number[],
        limit: number,
        securityFilter: SecurityFilter
    ): Promise<VectorDocument[]> {
        // Build ACL filter: (ownerId = ? OR accessIds && ?)
        // Using pgvector cosine distance operator <=>
        const accessFilter = securityFilter.groupIds.length > 0 
            ? `access_ids && ARRAY[${securityFilter.groupIds.map((_, i) => `$${i + 4}`).join(',')}]::text[]`
            : 'FALSE';
        
        const query = `
            SELECT *, 1 - (vector <=> $1::vector) as distance
            FROM ${this.tableName}
            WHERE (owner_id = $2 OR ${accessFilter} OR access_ids @> ARRAY['r:global']::text[])
            ORDER BY distance DESC
            LIMIT $3
        `;

        const params = [
            `[${queryVector.join(',')}]`, 
            securityFilter.userId, 
            limit,
            ...securityFilter.groupIds.map(g => `g:${g}`)
        ];

        const { rows } = await this.pool.query(query, params);
        
        return rows.map((row: any) => ({
            id: row.id,
            docId: row.doc_id,
            text: row.text,
            vector: row.vector ? row.vector.slice(1, -1).split(',').map(Number) : [],
            ownerId: row.owner_id,
            accessIds: row.access_ids,
            metadata: row.metadata,
            _distance: 1 - row.distance
        }));
    }

    async updateAccess(docId: string, accessIds: string[]): Promise<void> {
        await this.pool.query(`UPDATE ${this.tableName} SET access_ids = $1 WHERE doc_id = $2`, [accessIds, docId]);
    }

    async scan(callback: (documents: VectorDocument[]) => Promise<void>): Promise<void> {
        const { rows } = await this.pool.query(`SELECT * FROM ${this.tableName}`);
        
        const chunkSize = 100;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const mapped = chunk.map((row: any) => ({
                id: row.id,
                docId: row.doc_id,
                text: row.text,
                vector: row.vector ? row.vector.slice(1, -1).split(',').map(Number) : [],
                ownerId: row.owner_id,
                accessIds: row.access_ids,
                metadata: row.metadata
            }));
            await callback(mapped);
        }
    }
}
