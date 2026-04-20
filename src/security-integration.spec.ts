import { describe, it, expect, vi, beforeAll } from 'vitest';
import { encrypt, decrypt } from './lib/server/security/crypto';
import { setJwtSecret, getJwtSecret } from './lib/server/security/vault';
import { SignJWT, jwtVerify } from 'jose';

describe('Security Chain Integration', () => {
    const passphrase = 'control-room-passphrase-2026';
    const jwtSecretMaterial = 'core-intelligence-secret-key';

    it('should complete the full bootstrap and authentication cycle', async () => {
        // 1. Encryption (Simulated Setup)
        const encryptedBlob = await encrypt(jwtSecretMaterial, passphrase);
        expect(encryptedBlob).toContain('salt');

        // 2. Decryption (Simulated Boot)
        const recoveredSecret = await decrypt(encryptedBlob, passphrase);
        expect(recoveredSecret).toBe(jwtSecretMaterial);

        // 3. Vault Injection
        setJwtSecret(recoveredSecret);
        expect(getJwtSecret()).toBe(jwtSecretMaterial);

        // 4. Token Issuance (Simulated Login)
        const secret = new TextEncoder().encode(getJwtSecret());
        const token = await new SignJWT({ sub: 'user-123', email: 'test@hrag.local' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(secret);

        expect(token).toBeDefined();

        // 5. Token Verification (Simulated Middleware)
        const { payload } = await jwtVerify(token, secret);
        expect(payload.sub).toBe('user-123');
        expect(payload.email).toBe('test@hrag.local');
    });

    it('should fail bootstrap if passphrase is wrong', async () => {
        const encryptedBlob = await encrypt(jwtSecretMaterial, passphrase);
        await expect(decrypt(encryptedBlob, 'wrong-passphrase')).rejects.toThrow(/Decryption failed/);
    });
});
