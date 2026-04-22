import { ensureBucket } from '../src/lib/server/security/s3';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const bucket = process.argv[2];
    if (!bucket) {
        console.error('Usage: tsx ensure-bucket.ts <bucket-name>');
        process.exit(1);
    }

    try {
        await ensureBucket(bucket);
        console.log(`[+] Bucket ensured: ${bucket}`);
    } catch (err: any) {
        console.error(`[!] Failed to ensure bucket ${bucket}:`, err.message);
        process.exit(1);
    }
}

main().catch(console.error);
