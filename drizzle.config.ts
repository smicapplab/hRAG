import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the same directory as the config
dotenv.config({ path: path.resolve(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.warn('[!] WARNING: DATABASE_URL is not set in environment.');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: { 
        url: dbUrl || 'file:local.db' 
    },
	verbose: true,
	strict: true
});
