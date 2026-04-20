import { S3Client, GetObjectCommand, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

if (typeof process !== 'undefined') {
    dotenv.config();
}

/**
 * Shared S3 client configured for Garage S3.
 */
const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'us-east-1', // Garage standard
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'missing',
        secretAccessKey: process.env.S3_SECRET_KEY || 'missing'
    },
    forcePathStyle: true // Mandatory for Garage/Minio
});

/**
 * Ensures the specified bucket exists, creating it if necessary.
 */
async function ensureBucket(bucket: string) {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            console.log(`[-] S3: Bucket '${bucket}' not found. Provisioning...`);
            await s3.send(new CreateBucketCommand({ Bucket: bucket }));
            console.log(`[+] S3: Bucket '${bucket}' created successfully.`);
        } else {
            throw err;
        }
    }
}

/**
 * Fetches the encrypted JWT secret blob from S3.
 */
export async function fetchSecretBlob(): Promise<string | undefined> {
    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: 'hrag-system',
            Key: 'secrets/jwt.enc'
        }));
        return response.Body?.transformToString();
    } catch (err: any) {
        if (err.name === 'NoSuchKey') return undefined;
        throw err;
    }
}

/**
 * Stores an encrypted secret blob in S3.
 * Used during initial setup or secret rotation.
 */
export async function storeSecretBlob(blob: string): Promise<void> {
    await ensureBucket('hrag-system');
    
    await s3.send(new PutObjectCommand({
        Bucket: 'hrag-system',
        Key: 'secrets/jwt.enc',
        Body: blob
    }));
}
