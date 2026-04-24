import * as lancedb from '@lancedb/lancedb';
import * as dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config();

async function addDummyResume() {
    const uri = 'hRAG/data/lancedb';
    const db = await lancedb.connect(uri);
    
    // We need embeddings. Let's use a very simple mock vector if we can't run the real one easily
    // or better, try to use the actual embedding function if it doesn't have too many dependencies
    
    console.log('[-] Adding dummy resume chunks for Steve...');
    
    const tableName = 'hrag_vectors';
    const tableNames = await db.tableNames();
    
    const dummyVector = new Array(384).fill(0).map(() => Math.random()); // Mock vector for all-MiniLM-L6-v2
    
    const data = [
        {
            id: crypto.randomUUID(),
            docId: 'steve-resume-123',
            text: 'Steve Torrefranca is a Senior Software Engineer with expertise in SvelteKit, Node.js, and Document Intelligence systems. He is the lead architect of hRAG.',
            vector: dummyVector,
            ownerId: '3a38d9d3-cb1c-4d2a-b11f-03c2761f89fa', // Admin
            accessIds: ',u:3a38d9d3-cb1c-4d2a-b11f-03c2761f89fa,,r:global,',
            metadata: JSON.stringify({ name: "Steve's Resume", chunkIndex: 0 })
        }
    ];

    if (tableNames.includes(tableName)) {
        const table = await db.openTable(tableName);
        await table.add(data);
    } else {
        await db.createTable(tableName, data);
    }
    
    console.log('[+] Dummy resume added to LanceDB.');
}

addDummyResume().catch(console.error);
