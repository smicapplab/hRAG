import { describe, it, expect, vi } from 'vitest';
import { getSignedDownloadUrl } from './s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://mock-signed-url.com')
}));

describe('S3 Security Utils', () => {
    it('should generate a signed URL', async () => {
        const url = await getSignedDownloadUrl('test-bucket', 'test-key', 60);
        expect(url).toBe('https://mock-signed-url.com');
        expect(getSignedUrl).toHaveBeenCalled();
    });
});
