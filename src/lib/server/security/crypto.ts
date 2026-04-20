import { pbkdf2, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);
const ITERATIONS = 600000; // OWASP recommendation for PBKDF2-SHA256
const KEY_LEN = 32; // 256-bit

/**
 * Derives a cryptographic key from a passphrase and salt using PBKDF2.
 * @param passphrase The user-provided master passphrase.
 * @param salt The unique salt for this derivation.
 * @returns A Buffer containing the derived key.
 */
export async function deriveKey(passphrase: string, salt: Buffer): Promise<Buffer> {
	return pbkdf2Async(passphrase, salt, ITERATIONS, KEY_LEN, 'sha256');
}

/**
 * Encrypts plaintext using AES-256-GCM with a key derived from the passphrase.
 * Generates a unique salt and IV for every call.
 * @param text The plaintext to encrypt.
 * @param passphrase The master passphrase used for key derivation.
 * @returns A stringified JSON blob containing salt, iv, tag, and content.
 */
export async function encrypt(text: string, passphrase: string): Promise<string> {
	const salt = randomBytes(16);
	const iv = randomBytes(12);
	const key = await deriveKey(passphrase, salt);

	const cipher = createCipheriv('aes-256-gcm', key, iv);
	let encrypted = cipher.update(text, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	const tag = cipher.getAuthTag().toString('base64');

	return JSON.stringify({
		salt: salt.toString('base64'),
		iv: iv.toString('base64'),
		tag,
		content: encrypted
	});
}

/**
 * Decrypts a secure JSON blob using AES-256-GCM.
 * Extracts the salt from the blob to derive the correct key.
 * @param jsonBlob The stringified JSON blob from encrypt().
 * @param passphrase The master passphrase used for key derivation.
 * @returns The decrypted plaintext.
 * @throws Error if the blob is malformed or authentication fails.
 */
export async function decrypt(jsonBlob: string, passphrase: string): Promise<string> {
	try {
		const { salt, iv, tag, content } = JSON.parse(jsonBlob);
		if (!salt || !iv || !tag || !content) {
			throw new Error('Missing required fields in secure blob');
		}

		const key = await deriveKey(passphrase, Buffer.from(salt, 'base64'));
		const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
		decipher.setAuthTag(Buffer.from(tag, 'base64'));

		let decrypted = decipher.update(content, 'base64', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	} catch (err: unknown) {
		const error = err as Error;
		throw new Error(`Decryption failed: Malformed or invalid secure blob. ${error.message}`, {
			cause: err
		});
	}
}
