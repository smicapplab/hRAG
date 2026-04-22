import { db } from '../db';
import { systemSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * hRAG Stateless Settings Registry
 * Provides a cluster-wide configuration layer with a 5-minute TTL cache.
 */

let settingsCache: Record<string, any> = {};
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches all settings from the database and updates the local cache.
 */
async function refreshCache() {
    try {
        const settings = await db.select().from(systemSettings);
        const newCache: Record<string, any> = {};
        
        for (const s of settings) {
            try {
                newCache[s.key] = JSON.parse(s.value);
            } catch {
                newCache[s.key] = s.value;
            }
        }
        
        settingsCache = newCache;
        lastFetch = Date.now();
    } catch (err) {
        console.error('[!] Failed to refresh settings cache:', err);
    }
}

/**
 * Retrieves a system setting by key.
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
    if (Date.now() - lastFetch > CACHE_TTL) {
        await refreshCache();
    }
    
    return (settingsCache[key] as T) ?? defaultValue;
}

/**
 * Updates a system setting and invalidates the local cache.
 */
export async function setSetting(key: string, value: any, userId?: string) {
    const stringifiedValue = JSON.stringify(value);
    
    await db.insert(systemSettings)
        .values({
            key,
            value: stringifiedValue,
            updatedBy: userId,
            updatedAt: new Date()
        })
        .onConflictDoUpdate({
            target: systemSettings.key,
            set: {
                value: stringifiedValue,
                updatedBy: userId,
                updatedAt: new Date()
            }
        });
        
    // Proactive local cache update
    settingsCache[key] = value;
}
