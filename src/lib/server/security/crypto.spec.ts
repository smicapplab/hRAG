import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto';

describe('Security Primitives (Hardened)', () => {
	const passphrase = 'test-passphrase-2026';
	const secret = 'super-secret-jwt-key-material';

	it('should encrypt and decrypt correctly with dynamic salt', async () => {
		const encrypted = await encrypt(secret, passphrase);
		const decrypted = await decrypt(encrypted, passphrase);
		expect(decrypted).toBe(secret);

		// Verify JSON structure contains salt
		const parsed = JSON.parse(encrypted);
		expect(parsed).toHaveProperty('salt');
		expect(parsed).toHaveProperty('iv');
		expect(parsed).toHaveProperty('tag');
		expect(parsed).toHaveProperty('content');
	});

	it('should produce different ciphertext for same input (due to random salt/iv)', async () => {
		const enc1 = await encrypt(secret, passphrase);
		const enc2 = await encrypt(secret, passphrase);
		expect(enc1).not.toBe(enc2);
	});

	it('should throw error when decrypting with wrong passphrase', async () => {
		const encrypted = await encrypt(secret, passphrase);
		await expect(decrypt(encrypted, 'wrong-passphrase')).rejects.toThrow(/Decryption failed/);
	});

	it('should throw error when tampering with ciphertext', async () => {
		const encryptedJson = await encrypt(secret, passphrase);
		const encrypted = JSON.parse(encryptedJson);

		// Tamper with the content
		encrypted.content = Buffer.from('tampered-content').toString('base64');
		const tamperedJson = JSON.stringify(encrypted);

		await expect(decrypt(tamperedJson, passphrase)).rejects.toThrow(/Decryption failed/);
	});

	it('should throw error for malformed JSON', async () => {
		await expect(decrypt('not-json', passphrase)).rejects.toThrow(/Decryption failed/);
	});

	it('should throw error for missing fields', async () => {
		const malformed = JSON.stringify({ iv: 'abc', tag: 'def' });
		await expect(decrypt(malformed, passphrase)).rejects.toThrow(/Missing required fields/);
	});
});
