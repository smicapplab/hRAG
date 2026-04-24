import { db } from '../src/lib/server/db';
import * as schema from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { extractText, chunkText } from '../src/lib/server/ingestion/extractor';
import { generateEmbeddings } from '../src/lib/server/ingestion/embeddings';
import { getVectorStore } from '../src/lib/server/vectors';
import crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function bootstrap() {
    console.log('[-] Bootstrapping Vector Store from seeded documents...');

    const documents = await db.select().from(schema.documents);
    const vectorStore = await getVectorStore();

    for (const doc of documents) {
        console.log(`[-] Processing ${doc.name}...`);
        
        // Find the file in seed_data/assets if possible
        const filename = doc.name;
        const seedPath = path.join(process.cwd(), 'seed_data/assets', filename);
        
        let filePath = seedPath;
        let mimeType = 'application/pdf';
        if (filename.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (filename.endsWith('.png')) mimeType = 'image/png';

        try {
            await fs.access(filePath);
        } catch {
            // Try matching by s3_key basename
            const altName = path.basename(doc.s3Key);
            filePath = path.join(process.cwd(), 'seed_data/assets', altName);
            try {
                await fs.access(filePath);
            } catch {
                console.warn(`[!] File not found for ${doc.name}, skipping.`);
                continue;
            }
        }

        console.log(`[-] Extracting text from ${filePath}...`);
        const { text, method } = await extractText(filePath, mimeType);
        
        console.log(`[-] Chunking and Embedding...`);
        const chunks = await chunkText(text);
        const vectors = await generateEmbeddings(chunks);

        const vectorDocs = chunks.map((chunkText, i) => ({
            id: crypto.randomUUID(),
            docId: doc.id,
            text: chunkText,
            vector: vectors[i],
            ownerId: doc.ownerId,
            accessIds: [`,u:${doc.ownerId},`, ',r:global,'],
            metadata: {
                name: doc.name,
                chunkIndex: i,
                extractionMethod: method
            }
        }));

        await vectorStore.addDocuments(vectorDocs);
        console.log(`[+] Indexed ${doc.name} (${chunks.length} chunks).`);
    }

    console.log('[+] Bootstrap complete.');
}

bootstrap().catch(console.error);
