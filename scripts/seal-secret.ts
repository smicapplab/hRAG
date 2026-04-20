import { encrypt } from '../src/lib/server/security/crypto';
import { storeSecretBlob } from '../src/lib/server/security/s3';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * hRAG Security Sealer
 * Encrypts the local JWT_SECRET and uploads it to S3 using the master passphrase.
 */
async function seal() {
    console.log('[-] Security Sealer: Initializing...');

    const secret = process.env.JWT_SECRET;
    const passphrase = process.env.HRAG_MASTER_PASSPHRASE;

    if (!secret || !passphrase) {
        console.error('[!] FATAL: JWT_SECRET or HRAG_MASTER_PASSPHRASE missing from .env');
        process.exit(1);
    }

    try {
        console.log('[-] Encrypting secret material...');
        const blob = await encrypt(secret, passphrase);

        console.log('[-] Vaulting secret to S3 (hrag-system/secrets/jwt.enc)...');
        await storeSecretBlob(blob);

        console.log('[+] Security Seal successful. Secret is now persistent in S3.');
    } catch (err: any) {
        console.error('[!] FATAL: Sealing failed.');
        console.error('Error Details:', err.message || err);
        if (err.$metadata) {
            console.error('S3 Metadata:', JSON.stringify(err.$metadata, null, 2));
        }
        process.exit(1);
    }
}

seal().catch(console.error);
