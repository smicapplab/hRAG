import { db } from '$lib/server/db';
import { classificationPolicies, systemSettings, documents, apiKeys } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { fetchOpenAIModels, fetchOllamaModels, fetchGoogleModels, type DiscoveredModel } from '$lib/server/admin/discovery';
import { getSetting, setSetting, refreshCache, getAllSettings } from '$lib/server/admin/registry';

export const load: PageServerLoad = async () => {
    // Force refresh cache on load to ensure we see the latest updates from any node
    await refreshCache(true);
    
    const policies = await db.select().from(classificationPolicies);
    const quarantine = await db.select().from(documents).where(eq(documents.reviewStatus, 'PENDING'));
    const keys = await db.select().from(apiKeys);
    const settings = await getAllSettings();
    
    return {
        policies,
        settings,
        quarantine,
        apiKeys: keys
    };
};

export const actions: Actions = {
    updatePolicy: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;
        const displayName = data.get('displayName') as string;
        const minRoleRequired = data.get('minRoleRequired') as any;
        const severityWeight = parseInt(data.get('severityWeight') as string);
        const description = data.get('description') as string;

        await db.update(classificationPolicies)
            .set({ displayName, minRoleRequired, severityWeight, description })
            .where(eq(classificationPolicies.id, id));
        
        return { success: true };
    },

    updateSetting: async ({ request, locals }) => {
        if (!locals.user) return fail(401);
        
        const data = await request.formData();
        const key = data.get('key') as string;
        let value: any = data.get('value');

        // Handle numeric values (like INGESTION_MAX_SIZE in MB)
        if (key === 'ingestion.max_file_size') {
            value = parseInt(value) * 1024 * 1024; // Convert MB to Bytes
        } else if (key === 'ingestion.chunk_size' || key === 'ingestion.chunk_overlap') {
            value = parseInt(value);
        } else if (key === 'system.maintenance_mode' || key === 'classification.auto_enabled') {
            value = value === 'on' || value === 'true';
        } else if (key === 'ingestion.allowed_extensions') {
            value = value.split(',').map((s: string) => s.trim().toLowerCase());
        }

        // Use the centralized setSetting which handles DB and local cache update
        await setSetting(key, value, locals.user.id);
        
        // Immediately refresh cache to ensure next load gets this change
        await refreshCache(true);
        
        return { success: true };
    },

    syncModels: async ({ request, locals }) => {
        if (!locals.user) return fail(401);
        const data = await request.formData();
        const provider = data.get('provider') as string;

        try {
            let models: DiscoveredModel[] = [];
            if (provider === 'openai') {
                const key = await getSetting('gateways.openai.key', '');
                models = await fetchOpenAIModels(key);
            } else if (provider === 'ollama') {
                const url = await getSetting('gateways.ollama.url', 'http://localhost:11434');
                models = await fetchOllamaModels(url);
            } else if (provider === 'google') {
                const key = await getSetting('gateways.google.key', '');
                models = await fetchGoogleModels(key);
            }

            const registryKey = `gateways.${provider}.models`;
            await db.insert(systemSettings)
                .values({ 
                    key: registryKey, 
                    value: JSON.stringify(models), 
                    updatedBy: locals.user.id,
                    updatedAt: new Date()
                })
                .onConflictDoUpdate({
                    target: systemSettings.key,
                    set: { 
                        value: JSON.stringify(models), 
                        updatedBy: locals.user.id, 
                        updatedAt: new Date() 
                    }
                });

            return { success: true };
        } catch (err: any) {
            return fail(500, { error: err.message });
        }
    },

    resolveQuarantine: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;
        const status = data.get('status') as 'APPROVED' | 'OVERRIDDEN';
        const classification = data.get('classification') as string;

        await db.update(documents)
            .set({ reviewStatus: status, classification })
            .where(eq(documents.id, id));
        
        return { success: true };
    },

    createApiKey: async ({ request, locals }) => {
        if (!locals.user) return fail(401);
        
        const data = await request.formData();
        const name = data.get('name') as string;
        const role = data.get('role') as 'AGENT' | 'ADMIN';

        const key = `hrag_${crypto.randomBytes(24).toString('hex')}`;

        await db.insert(apiKeys).values({
            id: crypto.randomUUID(),
            key,
            name,
            role,
            ownerId: locals.user.id,
            createdAt: new Date()
        });

        return { success: true, newKey: key };
    },

    deleteApiKey: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;

        await db.delete(apiKeys).where(eq(apiKeys.id, id));
        
        return { success: true };
    }
};
