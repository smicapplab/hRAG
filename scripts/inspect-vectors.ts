import * as lancedb from '@lancedb/lancedb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function inspect() {
    const uris = ['data/lancedb', 'hRAG/data/lancedb', './local.db']; // checking common spots
    
    for (const uri of uris) {
        try {
            console.log(`[-] Inspecting URI: ${uri}`);
            const db = await lancedb.connect(uri);
            const tableNames = await db.tableNames();
            console.log(`[+] Tables: ${tableNames.join(', ')}`);
            
            if (tableNames.includes('hrag_vectors')) {
                const table = await db.openTable('hrag_vectors');
                const count = await table.countRows();
                console.log(`[+] Row count: ${count}`);
                
                if (count > 0) {
                    const rows = await table.query().limit(5).toArray();
                    console.log('[+] Sample Rows:');
                    rows.forEach(r => {
                        console.log(`  - ID: ${r.id} | DocID: ${r.docId}`);
                        console.log(`    Metadata: ${r.metadata}`);
                        console.log(`    Text: ${r.text.slice(0, 100)}...`);
                        console.log(`    Access: ${r.accessIds}`);
                    });
                }
            }
        } catch (err: any) {
            console.log(`[!] Failed to connect to ${uri}: ${err.message}`);
        }
    }
}

inspect().catch(console.error);
