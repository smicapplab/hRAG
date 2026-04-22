import { LanceDBStore } from '../src/lib/server/vectors/lancedb';
import { PgVectorStore } from '../src/lib/server/vectors/pgvector';
import { VectorStore, VectorDocument } from '../src/lib/server/vectors';
import * as dotenv from 'dotenv';

dotenv.config();

async function getStore(type: string): Promise<VectorStore> {
    if (type === 'lancedb') {
        const store = new LanceDBStore();
        await store.initialize();
        return store;
    } else if (type === 'pgvector') {
        const store = new PgVectorStore();
        await store.initialize();
        return store;
    }
    throw new Error(`Unknown vector store type: ${type}`);
}

async function migrate() {
    const sourceEngine = process.env.MIGRATE_SOURCE_ENGINE;
    const targetEngine = process.env.MIGRATE_TARGET_ENGINE;

    if (!sourceEngine || !targetEngine) {
        console.error('[!] Usage: MIGRATE_SOURCE_ENGINE=lancedb MIGRATE_TARGET_ENGINE=pgvector tsx scripts/migrate-vectors.ts');
        process.exit(1);
    }

    if (sourceEngine === targetEngine) {
        console.log('[!] Source and target engines are the same. Nothing to do.');
        return;
    }

    console.log(`[-] Vector Migration: ${sourceEngine} -> ${targetEngine}`);

    const sourceStore = await getStore(sourceEngine);
    const targetStore = await getStore(targetEngine);

    let totalCount = 0;
    let migratedCount = 0;

    await sourceStore.scan(async (docs: VectorDocument[]) => {
        totalCount += docs.length;
        console.log(`[-] Migrating batch of ${docs.length} documents...`);
        await targetStore.addDocuments(docs);
        migratedCount += docs.length;
        console.log(`[+] Progress: ${migratedCount} / ???`);
    });

    console.log(`[+] Migration complete.`);
    console.log(`[+] Source Count: ${totalCount}`);
    console.log(`[+] Target Count: ${migratedCount}`);

    if (totalCount !== migratedCount) {
        console.error('[!] FATAL: Row count mismatch after migration!');
        process.exit(1);
    }
}

migrate().catch(console.error);
