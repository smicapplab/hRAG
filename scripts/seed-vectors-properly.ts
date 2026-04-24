import { generateEmbeddings } from '../src/lib/server/ingestion/embeddings';
import { getVectorStore } from '../src/lib/server/vectors';
import crypto from 'node:crypto';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
    console.log('[-] Seeding Steve\'s Resume with REAL embeddings...');
    
    const text = "Steve Torrefranca is a Senior Software Engineer and the lead architect of hRAG. He specializes in SvelteKit, Node.js, and Document Intelligence. He lives in the Philippines.";
    
    try {
        const vectors = await generateEmbeddings([text]);
        const vectorStore = await getVectorStore();
        
        const docId = 'steve-resume-proper';
        const ownerId = '3a38d9d3-cb1c-4d2a-b11f-03c2761f89fa'; // Admin
        
        const documents = [{
            id: crypto.randomUUID(),
            docId,
            text,
            vector: vectors[0],
            ownerId,
            accessIds: [`,u:${ownerId},`, ',r:global,'],
            metadata: {
                name: "Steve's Professional Resume",
                chunkIndex: 0
            }
        }];

        await vectorStore.addDocuments(documents);
        console.log('[+] Successfully indexed proper resume vectors.');
    } catch (err: any) {
        console.error('[!] Seeding failed:', err.message);
    }
}

seed().catch(console.error);
