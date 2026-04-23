import { db } from '$lib/server/db';
import { classificationPolicies, systemSettings, documents, apiKeys } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { fetchOpenAIModels, fetchOllamaModels, fetchGoogleModels, type DiscoveredModel } from '$lib/server/admin/discovery';
import { getSetting } from '$lib/server/admin/registry';

// ... (load function remains same)

export const actions: Actions = {
    // ... (updatePolicy, updateSetting remain same)

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
