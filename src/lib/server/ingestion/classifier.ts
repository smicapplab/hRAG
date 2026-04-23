import { db } from '../db';
import { classificationPolicies, tags as tagsTable } from '../db/schema';
import { getSetting } from '../admin/registry';
import { generateQueryEmbedding } from './embeddings';

/**
 * hRAG Classification Engine
 * Implements the "High-Water Mark" logic to ensure zero-trust security.
 */

export interface ClassificationResult {
    policyCode: string;
    severityWeight: number;
    isOverride: boolean;
}

/**
 * Resolves the final classification by comparing user input and AI assessment.
 */
export async function resolveClassification(
    userPolicyCode: string,
    aiPolicyCode: string
): Promise<ClassificationResult> {
    const policies = await db.select().from(classificationPolicies);
    
    const userPolicy = policies.find(p => p.code === userPolicyCode);
    const aiPolicy = policies.find(p => p.code === aiPolicyCode);

    if (!userPolicy) throw new Error(`Invalid user policy code: ${userPolicyCode}`);
    if (!aiPolicy) throw new Error(`Invalid AI policy code: ${aiPolicyCode}`);

    const isOverride = aiPolicy.severityWeight > userPolicy.severityWeight;
    
    return {
        policyCode: isOverride ? aiPolicy.code : userPolicy.code,
        severityWeight: Math.max(userPolicy.severityWeight, aiPolicy.severityWeight),
        isOverride
    };
}

/**
 * Simple local regex classifier for initial security scanning.
 */
export async function localClassify(text: string): Promise<string> {
    const rules = [
        { pattern: /\b\d{3}-\d{2}-\d{4}\b/, policy: 'RESTRICTED', reason: 'SSN detected' },
        { pattern: /\b(?:\d[ -]*?){13,16}\b/, policy: 'CONFIDENTIAL', reason: 'Credit Card detected' },
        { pattern: /CONFIDENTIAL|SECRET|PROPRIETARY/i, policy: 'CONFIDENTIAL', reason: 'Keyword match' },
        { pattern: /INTERNAL USE ONLY/i, policy: 'INTERNAL', reason: 'Keyword match' }
    ];

    for (const rule of rules) {
        if (rule.pattern.test(text)) {
            return rule.policy;
        }
    }

    return 'INTERNAL'; // Default fallback
}

/**
 * AI-assisted classification using Ollama or Cloud Providers.
 * (Skeleton for Phase 2 integration)
 */
export async function aiClassify(text: string): Promise<string> {
    const isAutoEnabled = await getSetting('classification.auto_enabled', true);
    if (!isAutoEnabled) return 'INTERNAL';

    // In a real implementation, this would call the configured LLM provider.
    // For now, we fallback to the local classifier.
    return localClassify(text);
}

/**
 * Suggests multi-label discovery tags based on content.
 */
export async function suggestTags(text: string): Promise<string[]> {
    const isAutoEnabled = await getSetting('classification.auto_enabled', true);
    if (!isAutoEnabled) return [];

    // 1. Keyword Extraction (Fast)
    const suggestions: string[] = [];
    
    const keywords = [
        { tag: 'FINANCE', patterns: [/revenue/i, /budget/i, /invoice/i, /financial/i] },
        { tag: 'LEGAL', patterns: [/contract/i, /agreement/i, /compliance/i, /terms/i] },
        { tag: 'TECH', patterns: [/engineering/i, /architecture/i, /source code/i, /api/i] },
        { tag: 'HR', patterns: [/personnel/i, /hiring/i, /employee/i, /payroll/i] }
    ];

    for (const item of keywords) {
        if (item.patterns.some(p => p.test(text))) {
            suggestions.push(item.tag);
        }
    }

    // 2. Semantic Vector Matching (Fallback/Refinement)
    try {
        const docVector = await generateQueryEmbedding(text.slice(0, 1000));
        const allTags = await db.select().from(tagsTable);
        
        // We embed tag names on the fly. 
        // Note: For large tag sets, we would pre-index these in a separate LanceDB table.
        for (const tag of allTags) {
            if (suggestions.includes(tag.name)) continue;
            
            const tagVector = await generateQueryEmbedding(tag.name);
            
            // Cosine Similarity
            const dotProduct = docVector.reduce((acc, val, i) => acc + val * tagVector[i], 0);
            const magA = Math.sqrt(docVector.reduce((acc, val) => acc + val * val, 0));
            const magB = Math.sqrt(tagVector.reduce((acc, val) => acc + val * val, 0));
            const similarity = dotProduct / (magA * magB);

            if (similarity > 0.7) { 
                suggestions.push(tag.name);
            }
        }
    } catch (err) {
        console.warn('[Classifier] Semantic tagging failed, falling back to keywords:', err);
    }

    return [...new Set(suggestions)];
}
