import { db } from '../src/lib/server/db';
import { getSetting, setSetting } from '../src/lib/server/admin/registry';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

async function update() {
    console.log('[-] hRAG Update Orchestrator: Starting...');

    // 1. Version Check
    const currentVersion = packageJson.version;
    const dbVersion = await getSetting('system.version', '0.0.0');
    console.log(`[-] Version Check: DB(${dbVersion}) -> Target(${currentVersion})`);

    if (dbVersion === currentVersion) {
        console.log('[!] System is already up to date.');
    }

    // 2. Security Check (Master Passphrase)
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const envPassphrase = process.env.HRAG_MASTER_PASSPHRASE;
    let passphrase = envPassphrase;

    if (!passphrase) {
        passphrase = await rl.question('[?] Enter HRAG_MASTER_PASSPHRASE to proceed: ');
    }

    if (!passphrase) {
        console.error('[!] FATAL: Master Passphrase is required for upgrade.');
        process.exit(1);
    }
    rl.close();

    // 3. Pre-flight checks
    const isPrimary = process.env.HRAG_PRIMARY === 'true';
    if (!isPrimary) {
        console.warn('[!] WARNING: This node is NOT marked as HRAG_PRIMARY=true.');
        console.warn('[!] Migrations should ideally be run from the primary node.');
    }

    try {
        // 4. Relational Phase: Execute SQL migrations
        console.log('[-] Relational Phase: Running Drizzle migrations...');
        execSync('npm run db:migrate', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
        console.log('[+] Relational Phase: Migrations complete.');

        // 5. Vector Phase: Checking for engine transitions
        console.log('[-] Vector Phase: Checking for engine transitions...');
        const currentEngine = process.env.VECTOR_STORE_TYPE || 'lancedb';
        const lastEngine = await getSetting('system.vector_engine', currentEngine);

        if (currentEngine !== lastEngine) {
            console.log(`[-] Engine Switch Detected: ${lastEngine} -> ${currentEngine}`);
            console.log('[-] Triggering vector migration...');
            execSync(`MIGRATE_SOURCE_ENGINE=${lastEngine} MIGRATE_TARGET_ENGINE=${currentEngine} tsx scripts/migrate-vectors.ts`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
            await setSetting('system.vector_engine', currentEngine);
        } else {
            console.log('[+] No vector engine switch detected.');
            // Ensure the setting is present if it's the first run
            await setSetting('system.vector_engine', currentEngine);
        }

        // 6. Post-flight: Update system_settings
        console.log(`[-] Post-flight: Updating system.version to ${currentVersion}...`);
        await setSetting('system.version', currentVersion);

        // 7. Health Check: Verifying cluster operational status
        console.log('[-] Health Check: Verifying cluster operational status...');
        const port = process.env.PORT || '5173';
        const host = process.env.HOST || 'localhost';
        const url = `http://${host}:${port}/api/v1/health`;

        console.log(`[-] Checking health at ${url}...`);
        try {
            // Wait a bit for the server to potentially restart or stabilize if it was running
            const response = await fetch(url);
            const health = await response.json() as any;
            if (health.status === 'ok') {
                console.log('[+] Health Check PASSED.');
            } else {
                console.warn('[!] Health Check returned issues:', JSON.stringify(health.checks, null, 2));
            }
        } catch (err: any) {
            console.warn('[!] Health Check FAILED (Is the server running?):', err.message);
            console.warn('[!] Manual verification of /api/v1/health is recommended.');
        }

        console.log('[+] hRAG Update successful.');
    } catch (err: any) {
        console.error('[!] FATAL: Update failed.');
        console.error('Error Details:', err.message || err);
        process.exit(1);
    }
}

update().catch(console.error);
