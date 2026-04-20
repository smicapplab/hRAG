import { pbkdf2, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);
const ITERATIONS = 100000;
const KEY_LEN = 32; // 256-bit

export async function deriveKey(passphrase: string) {
    return pbkdf2Async(passphrase, 'hrag-salt-static', ITERATIONS, KEY_LEN, 'sha256');
}

export async function encrypt(text: string, key: Buffer) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag().toString('base64');
    return JSON.stringify({ iv: iv.toString('base64'), tag, content: encrypted });
}

export async function decrypt(jsonBlob: string, key: Buffer) {
    const { iv, tag, content } = JSON.parse(jsonBlob);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    let decrypted = decipher.update(content, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
