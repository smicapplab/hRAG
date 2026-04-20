import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Standard Node.js environment variable loading
if (typeof process !== 'undefined') {
    dotenv.config();
}

// In SvelteKit, DATABASE_URL will be in process.env if using adapter-node or during dev.
// For other environments, we ensure it's loaded from .env.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const client = createClient({ url: databaseUrl });

export const db = drizzle(client, { schema });
export { schema };
