import { describe, it, expect } from 'vitest';
import { deriveKey, encrypt, decrypt } from './crypto';

describe('Security Primitives', () => {
    const passphrase = 'test-passphrase';
    const secret = 'super-secret-jwt-key';

    it('should derive consistent keys from passphrase', async () => {
        const key1 = await deriveKey(passphrase);
        const key2 = await deriveKey(passphrase);
        expect(key1).toEqual(key2);
    });

    it('should encrypt and decrypt correctly', async () => {
        const key = await deriveKey(passphrase);
        const encrypted = await encrypt(secret, key);
        const decrypted = await decrypt(encrypted, key);
        expect(decrypted).toBe(secret);
    });
});
