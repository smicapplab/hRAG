/**
 * @file In-memory vault for sensitive runtime secrets.
 * Secrets are populated during the boot sequence and never written to disk.
 */

let jwtSecret: string | null = null;

/**
 * Sets the JWT secret in memory. Should only be called by the boot loader.
 */
export function setJwtSecret(secret: string) {
    jwtSecret = secret;
}

/**
 * Retrieves the JWT secret from memory.
 * @throws Error if the secret hasn't been initialized.
 */
export function getJwtSecret(): string {
    if (!jwtSecret) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[!] WARNING: JWT Secret not initialized. Using insecure development fallback.');
            return process.env.JWT_SECRET || 'dev-secret-only-not-for-production';
        }
        throw new Error('JWT Secret not initialized in memory. Security bootstrap required.');
    }
    return jwtSecret;
}
