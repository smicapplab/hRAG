import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Standard Node.js environment variable loading
if (typeof process !== 'undefined') {
    dotenv.config();
}

// Opaque dynamic import to bypass Vite's static analysis
const { createClient } = await import(/* @vite-ignore */ '@libsql/client');

// In SvelteKit, DATABASE_URL will be in process.env if using adapter-node or during dev.
// For other environments, we ensure it's loaded from .env.
const databaseUrl = process.env.DATABASE_URL || 'file:local.db';

const client = createClient({ url: databaseUrl });

export const db = drizzle(client, { schema });
export { schema };
