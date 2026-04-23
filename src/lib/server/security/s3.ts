import { S3Client, GetObjectCommand, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as dotenv from 'dotenv';

if (typeof process !== 'undefined') {
    dotenv.config();
}

/**
 * Shared S3 client configured for Garage S3.
 */
export const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'us-east-1', // Garage standard
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'missing',
        secretAccessKey: process.env.S3_SECRET_KEY || 'missing'
    },
    forcePathStyle: true // Mandatory for Garage/Minio
});

const verifiedBuckets = new Set<string>();

/**
 * Ensures the specified bucket exists, creating it if necessary.
 * Uses an in-memory cache to avoid redundant checks.
 */
export async function ensureBucket(bucket: string) {
    if (verifiedBuckets.has(bucket)) return;

    try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
        verifiedBuckets.add(bucket);
    } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            console.log(`[-] S3: Bucket '${bucket}' not found. Provisioning...`);
            await s3.send(new CreateBucketCommand({ Bucket: bucket }));
            verifiedBuckets.add(bucket);
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

/**
 * Generates an authenticated Pre-signed S3 URL for secure document download.
 * TTL is strictly enforced at 60 seconds as per Iron-Clad Security mandates.
 */
export async function getSignedDownloadUrl(bucket: string, key: string, ttl = 60): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    
    return await getSignedUrl(s3, command, { expiresIn: ttl });
}
