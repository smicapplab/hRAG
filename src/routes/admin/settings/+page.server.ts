import { db } from '$lib/server/db';
import { classificationPolicies, systemSettings, documents } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
    const policies = await db.select().from(classificationPolicies);
    const settings = await db.select().from(systemSettings);
    const quarantine = await db.select().from(documents).where(eq(documents.reviewStatus, 'PENDING'));
    
    return {
        policies,
        settings: settings.reduce((acc, s) => ({ ...acc, [s.key]: JSON.parse(s.value) }), {}),
        quarantine
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
        const value = data.get('value') as string;

        await db.insert(systemSettings)
            .values({ 
                key, 
                value: JSON.stringify(value), 
                updatedBy: locals.user.id,
                updatedAt: new Date()
            })
            .onConflictDoUpdate({
                target: systemSettings.key,
                set: { value: JSON.stringify(value), updatedBy: locals.user.id, updatedAt: new Date() }
            });
        
        return { success: true };
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
    }
};
